import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { MediaType, MediaStatus } from "../entities/media-item.entity";
import { ImportPreviewItem } from "./mal-import.service";

@Injectable()
export class TvTimeImportService {
  private readonly logger = new Logger(TvTimeImportService.name);

  async parseCsv(buffer: Buffer): Promise<ImportPreviewItem[]> {
    const text = buffer.toString("utf-8");
    const rows = this.parseCsvRecords(text).filter((r) =>
      r.some((c) => c.trim())
    );

    if (rows.length < 2) return [];

    const headers = rows[0];
    const idIdx = this.findColumn(headers, ["id", "tvdb_id", "thetvdb_id", "thetvdb"]);
    const nameIdx = this.findColumn(headers, ["name", "title", "series"]);
    const statusIdx = this.findColumn(headers, ["status"]);
    const seenIdx = this.findColumn(headers, ["seen_episodes"]);
    const airedIdx = this.findColumn(headers, ["aired_episodes"]);
    const runtimeIdx = this.findColumn(headers, ["runtime"]);
    const posterIdx = this.findColumn(headers, ["all_images.poster", "poster", "image"]);
    const upToDateIdx = this.findColumn(headers, ["up_to_date"]);
    const archivedIdx = this.findColumn(headers, ["archived"]);

    if (nameIdx === -1) {
      this.logger.warn("Could not find name column in TVTime CSV");
      return [];
    }

    const items: ImportPreviewItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length <= nameIdx) continue;

      const title = cols[nameIdx]?.trim();
      if (!title) continue;

      const tvdbId = idIdx >= 0 ? parseInt(cols[idIdx], 10) || null : null;
      const rawStatus = statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() : "";
      const seenEpisodes = seenIdx >= 0 ? parseInt(cols[seenIdx], 10) || 0 : 0;
      const airedEpisodes = airedIdx >= 0 ? parseInt(cols[airedIdx], 10) || null : null;
      const runtime = runtimeIdx >= 0 ? parseInt(cols[runtimeIdx], 10) || null : null;
      const posterUrl = posterIdx >= 0 ? cols[posterIdx]?.trim() || null : null;
      const upToDate = upToDateIdx >= 0 ? cols[upToDateIdx]?.trim().toLowerCase() === "true" : false;
      const archived = archivedIdx >= 0 ? cols[archivedIdx]?.trim().toLowerCase() === "true" : false;

      const status = this.mapStatus(rawStatus, upToDate, seenEpisodes, airedEpisodes);

      items.push({
        title,
        type: MediaType.TV,
        status,
        rating: null,
        externalIds: tvdbId ? { tvdbId } : {},
        metadata: {
          importSource: "tvtime",
          sourceType: "tv",
          sourceId: tvdbId,
          tags: ["tv"],
          episodes: airedEpisodes,
          episodesWatched: seenEpisodes,
          runtime,
          archived,
          importCoverUrl: posterUrl,
        },
        coverUrl: posterUrl,
      });
    }

    return items;
  }

  /**
   * TV Time exports TVDB identities, while MAL imports use MAL identities and
   * frequently a Japanese/romanized title. AniList exposes both identities and
   * title aliases, so it can safely bridge an incoming TV Time row to an anime
   * that already exists in this account. A result is only accepted when its MAL
   * id is already in the library and the searched title is one of its aliases.
   */
  async resolveExistingAnime(items: ImportPreviewItem[], existing: any[]): Promise<void> {
    const existingByMalId = new Map<number, any>();
    const existingByAlias = new Map<string, { item: any; aliases: string[] }>();
    for (const item of existing) {
      const malId = Number(item?.externalIds?.malId);
      if (!Number.isInteger(malId) || malId <= 0) continue;
      existingByMalId.set(malId, item);
      const aliases = this.uniqueTitles([
        item.title,
        item.metadata?.titleEnglish,
        item.metadata?.englishTitle,
        item.metadata?.titleJapanese,
        item.metadata?.titleRomaji,
        ...(Array.isArray(item.metadata?.alternativeTitles) ? item.metadata.alternativeTitles : []),
        ...(Array.isArray(item.metadata?.titleSynonyms) ? item.metadata.titleSynonyms : []),
        ...(Array.isArray(item.metadata?.synonyms) ? item.metadata.synonyms : []),
      ]);
      for (const alias of aliases) {
        const normalized = this.normalizeTitle(alias);
        if (normalized && !existingByAlias.has(normalized)) {
          existingByAlias.set(normalized, { item, aliases });
        }
      }
    }
    if (existingByMalId.size === 0) return;

    let unresolved = items.filter(
      (item) => item.metadata?.importSource === "tvtime" && !item.metadata?.matchedExistingId,
    );
    for (const item of unresolved) {
      const localMatch = existingByAlias.get(this.normalizeTitle(item.title));
      if (localMatch) this.applyAnimeMatch(item, localMatch.item, localMatch.aliases);
    }
    unresolved = unresolved.filter((item) => !item.metadata?.matchedExistingId);

    const batches: ImportPreviewItem[][] = [];
    for (let offset = 0; offset < unresolved.length; offset += 20) {
      batches.push(unresolved.slice(offset, offset + 20));
    }
    await Promise.all(batches.map((batch) => this.resolveAnimeBatch(batch, existingByMalId)));
  }

  private async resolveAnimeBatch(
    batch: ImportPreviewItem[],
    existingByMalId: Map<number, any>,
  ): Promise<void> {
    const variables: Record<string, string> = {};
    const fields = batch.map((item, index) => {
      variables[`search${index}`] = item.title;
      return `media${index}: Media(search: $search${index}, type: ANIME) {
          idMal
          title { romaji english native }
          synonyms
        }`;
    });
    const declarations = batch.map((_, index) => `$search${index}: String`).join(", ");

    try {
      const response = await axios.post(
        "https://graphql.anilist.co",
        {
          query: `query (${declarations}) { ${fields.join("\n")} }`,
          variables,
        },
        { timeout: 15000 },
      );
      const results = response.data?.data || {};

      batch.forEach((item, index) => {
        const result = results[`media${index}`];
        const malId = Number(result?.idMal);
        const match = existingByMalId.get(malId);
        if (!match) return;

        const aliases = this.uniqueTitles([
          result?.title?.romaji,
          result?.title?.english,
          result?.title?.native,
          ...(Array.isArray(result?.synonyms) ? result.synonyms : []),
        ]);
        const incomingTitle = this.normalizeTitle(item.title);
        if (!aliases.some((alias) => this.normalizeTitle(alias) === incomingTitle)) return;

        this.applyAnimeMatch(item, match, aliases);
      });
    } catch (error) {
      this.logger.warn(
        `Could not resolve TV Time anime aliases: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private applyAnimeMatch(item: ImportPreviewItem, match: any, aliases: string[]): void {
    const malId = Number(match?.externalIds?.malId);
    item.type = MediaType.ANIME;
    item.externalIds = { ...item.externalIds, malId };
    item.metadata = {
      ...item.metadata,
      sourceType: "anime",
      tags: ["anime", "tv"],
      matchedExistingId: match.id,
      alternativeTitles: aliases,
    };
  }

  private mapStatus(
    raw: string,
    upToDate: boolean,
    seen: number,
    aired: number | null
  ): MediaStatus {
    const relationship = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (relationship === "up_to_date") return MediaStatus.COMPLETED;
    if (relationship === "continuing") return MediaStatus.WATCHING;
    if (relationship === "stopped" || relationship === "on_hold") return MediaStatus.PAUSED;
    if (relationship === "dropped") return MediaStatus.DROPPED;
    if (relationship === "not_started_yet" || relationship === "watch_later") {
      return MediaStatus.PLANNING;
    }
    // If ended and all episodes seen
    if (raw.includes("ended") && aired && seen >= aired) return MediaStatus.COMPLETED;
    // Up to date on a continuing show
    if (upToDate && raw.includes("continuing")) return MediaStatus.WATCHING;
    // Continuing but not up to date
    if (raw.includes("continuing") && seen > 0) return MediaStatus.WATCHING;
    // Ended but not all seen
    if (raw.includes("ended") && seen > 0 && aired && seen < aired) return MediaStatus.PAUSED;
    // No episodes seen
    if (seen === 0) return MediaStatus.PLANNING;
    return MediaStatus.WATCHING;
  }

  private normalizeTitle(title: string): string {
    return title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\(\d{4}\)\s*$/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  private uniqueTitles(titles: unknown[]): string[] {
    return [...new Set(titles.filter((title): title is string => typeof title === "string" && !!title.trim()))];
  }

  private findColumn(headers: string[], candidates: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase();
      if (candidates.some((c) => h === c || h.includes(c))) return i;
    }
    return -1;
  }

  private parseCsvRecords(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
        if (char === "\r" && text[i + 1] === "\n") i++;
      } else {
        current += char;
      }
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      rows.push(row);
    }

    return rows;
  }
}
