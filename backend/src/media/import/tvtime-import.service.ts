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
    const idIdx = this.findColumn(headers, [
      "id",
      "tvdb_id",
      "thetvdb_id",
      "thetvdb",
    ]);
    const nameIdx = this.findColumn(headers, ["name", "title", "series"]);
    const statusIdx = this.findColumn(headers, ["status"]);
    const seenIdx = this.findColumn(headers, ["seen_episodes"]);
    const airedIdx = this.findColumn(headers, ["aired_episodes"]);
    const runtimeIdx = this.findColumn(headers, ["runtime"]);
    const posterIdx = this.findColumn(headers, [
      "all_images.poster",
      "poster",
      "image",
    ]);
    const upToDateIdx = this.findColumn(headers, ["up_to_date"]);
    const archivedIdx = this.findColumn(headers, ["archived"]);
    const entityTypeIdx = this.findColumn(headers, [
      "entity_type",
      "entity type",
    ]);

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
      const rawStatus =
        statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() : "";
      const seenRaw = seenIdx >= 0 ? cols[seenIdx]?.trim() || "" : "";
      const parsedSeenEpisodes = Number.parseInt(seenRaw, 10);
      const hasSeenEpisodes =
        seenRaw !== "" && Number.isFinite(parsedSeenEpisodes);
      const seenEpisodes = hasSeenEpisodes
        ? Math.max(0, parsedSeenEpisodes)
        : 0;
      const airedEpisodes =
        airedIdx >= 0 ? parseInt(cols[airedIdx], 10) || null : null;
      const runtime =
        runtimeIdx >= 0 ? parseInt(cols[runtimeIdx], 10) || null : null;
      const posterUrl = posterIdx >= 0 ? cols[posterIdx]?.trim() || null : null;
      const upToDate =
        upToDateIdx >= 0
          ? cols[upToDateIdx]?.trim().toLowerCase() === "true"
          : false;
      const archived =
        archivedIdx >= 0
          ? cols[archivedIdx]?.trim().toLowerCase() === "true"
          : false;
      const entityType =
        entityTypeIdx >= 0
          ? cols[entityTypeIdx]
              ?.trim()
              .toLowerCase()
              .replace(/[\s-]+/g, "_")
          : "series";
      const type = ["movie", "film"].includes(entityType)
        ? MediaType.MOVIE
        : MediaType.TV;

      const status = this.mapStatus(
        rawStatus,
        upToDate,
        seenEpisodes,
        airedEpisodes,
        type
      );
      const progressMode = this.progressMode(
        type,
        rawStatus,
        upToDate,
        hasSeenEpisodes
      );

      items.push({
        title,
        type,
        status,
        rating: null,
        externalIds: tvdbId ? { tvdbId } : {},
        metadata: {
          importSource: "tvtime",
          sourceType: type,
          sourceId: tvdbId,
          tags: [type],
          episodes: airedEpisodes,
          episodesWatched: seenEpisodes,
          tvTimeRelationship: rawStatus || null,
          tvTimeProgressMode: progressMode,
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
  async resolveExistingAnime(
    items: ImportPreviewItem[],
    existing: any[]
  ): Promise<void> {
    const existingByAlias = new Map<string, { item: any; aliases: string[] }>();
    const existingAnime: Array<{ item: any; malId: number }> = [];
    for (const item of existing) {
      const malId = Number(item?.externalIds?.malId);
      if (!Number.isInteger(malId) || malId <= 0) continue;
      existingAnime.push({ item, malId });
      const aliases = this.uniqueTitles([
        item.title,
        item.metadata?.titleEnglish,
        item.metadata?.englishTitle,
        item.metadata?.titleJapanese,
        item.metadata?.titleRomaji,
        ...(Array.isArray(item.metadata?.alternativeTitles)
          ? item.metadata.alternativeTitles
          : []),
        ...(Array.isArray(item.metadata?.titleSynonyms)
          ? item.metadata.titleSynonyms
          : []),
        ...(Array.isArray(item.metadata?.synonyms)
          ? item.metadata.synonyms
          : []),
      ]);
      for (const alias of aliases) {
        const normalized = this.normalizeTitle(alias);
        if (normalized && !existingByAlias.has(normalized)) {
          existingByAlias.set(normalized, { item, aliases });
        }
      }
    }
    let unresolved = items.filter(
      (item) =>
        item.type === MediaType.TV &&
        item.metadata?.importSource === "tvtime" &&
        !item.metadata?.matchedExistingId
    );
    for (const item of unresolved) {
      const localMatch = existingByAlias.get(this.normalizeTitle(item.title));
      if (localMatch)
        this.applyAnimeMatch(item, localMatch.item, localMatch.aliases);
    }
    unresolved = unresolved.filter((item) => !item.metadata?.matchedExistingId);
    if (unresolved.length === 0) return;

    if (existingAnime.length > 0) {
      const batches: Array<Array<{ item: any; malId: number }>> = [];
      for (let offset = 0; offset < existingAnime.length; offset += 20) {
        batches.push(existingAnime.slice(offset, offset + 20));
      }
      let aliasMatchingError: unknown;
      await this.runWithConcurrency(batches, 3, async (batch) => {
        try {
          await this.hydrateAnimeAliasBatch(batch, existingByAlias);
        } catch (error) {
          aliasMatchingError ||= error;
        }
      });

      for (const item of unresolved) {
        const match = existingByAlias.get(this.normalizeTitle(item.title));
        if (match) this.applyAnimeMatch(item, match.item, match.aliases);
      }
      unresolved = unresolved.filter(
        (item) => !item.metadata?.matchedExistingId
      );

      if (aliasMatchingError && unresolved.length > 0) {
        this.logger.warn(
          `TV Time preview will continue without remote anime matching: ${
            aliasMatchingError instanceof Error
              ? aliasMatchingError.message
              : String(aliasMatchingError)
          }`
        );
        for (const item of unresolved) {
          item.metadata = {
            ...item.metadata,
            animeClassificationState: "unavailable",
          };
        }
        return;
      }
    }
    if (unresolved.length === 0) return;

    const classificationBatches: ImportPreviewItem[][] = [];
    for (let offset = 0; offset < unresolved.length; offset += 20) {
      classificationBatches.push(unresolved.slice(offset, offset + 20));
    }
    await this.runWithConcurrency(classificationBatches, 3, (batch) =>
      this.classifyAnimeBatch(batch)
    );
  }

  private async runWithConcurrency<T>(
    batches: T[],
    concurrency: number,
    operation: (batch: T) => Promise<void>
  ): Promise<void> {
    let nextBatch = 0;
    const worker = async () => {
      while (nextBatch < batches.length) {
        const batch = batches[nextBatch++];
        await operation(batch);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, batches.length) }, () =>
        worker()
      )
    );
  }

  private async classifyAnimeBatch(batch: ImportPreviewItem[]): Promise<void> {
    const variables: Record<string, string> = {};
    const fields = batch.map((item, index) => {
      variables[`search${index}`] = item.title;
      return `page${index}: Page(page: 1, perPage: 1) {
        media(search: $search${index}, type: ANIME) {
          idMal
          title { romaji english native }
          synonyms
        }
      }`;
    });
    const declarations = batch
      .map((_, index) => `$search${index}: String`)
      .join(", ");

    try {
      const results = await this.fetchAniListData(
        `query (${declarations}) { ${fields.join("\n")} }`,
        variables
      );
      batch.forEach((item, index) => {
        const result = results[`page${index}`]?.media?.[0];
        const malId = Number(result?.idMal);
        if (!Number.isInteger(malId) || malId <= 0) return;
        const aliases = this.uniqueTitles([
          result?.title?.romaji,
          result?.title?.english,
          result?.title?.native,
          ...(Array.isArray(result?.synonyms) ? result.synonyms : []),
        ]);
        const incomingTitle = this.normalizeTitle(item.title);
        if (
          !aliases.some((alias) => this.normalizeTitle(alias) === incomingTitle)
        )
          return;
        item.type = MediaType.ANIME;
        item.externalIds = { ...item.externalIds, malId };
        item.metadata = {
          ...item.metadata,
          sourceType: "anime",
          tags: ["anime", "tv"],
          alternativeTitles: aliases,
          animeClassificationSource: "anilist-title-alias",
        };
      });
    } catch (error) {
      this.logger.warn(
        `TV Time anime classification was unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      for (const item of batch) {
        item.metadata = {
          ...item.metadata,
          animeClassificationState: "unavailable",
        };
      }
    }
  }

  private async fetchAniListData(
    query: string,
    variables: Record<string, string>
  ): Promise<Record<string, any>> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await axios.post(
          "https://graphql.anilist.co",
          { query, variables },
          { timeout: 15000 }
        );
        if (!response.data?.data)
          throw new Error("AniList returned no classification data");
        return response.data.data;
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.response?.status || 0);
        const retryable = status === 0 || status === 429 || status >= 500;
        if (!retryable || attempt === 2) break;
        const retryAfter = Number(
          error?.response?.headers?.["retry-after"] || 0
        );
        await this.pause(
          retryAfter > 0 ? retryAfter * 1000 : 100 * (attempt + 1)
        );
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async hydrateAnimeAliasBatch(
    batch: Array<{ item: any; malId: number }>,
    existingByAlias: Map<string, { item: any; aliases: string[] }>
  ): Promise<void> {
    const variables: Record<string, number> = {};
    const fields = batch.map(({ malId }, index) => {
      variables[`malId${index}`] = malId;
      return `media${index}: Media(idMal: $malId${index}, type: ANIME) {
          idMal
          title { romaji english native }
          synonyms
        }`;
    });
    const declarations = batch
      .map((_, index) => `$malId${index}: Int`)
      .join(", ");

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await axios.post(
          "https://graphql.anilist.co",
          {
            query: `query (${declarations}) { ${fields.join("\n")} }`,
            variables,
          },
          { timeout: 15000 }
        );
        if (!response.data?.data) {
          throw new Error("AniList returned no title-matching data");
        }
        const results = response.data.data;

        batch.forEach(({ item, malId }, index) => {
          const result = results[`media${index}`];
          if (Number(result?.idMal) !== malId) return;

          const aliases = this.uniqueTitles([
            item.title,
            result?.title?.romaji,
            result?.title?.english,
            result?.title?.native,
            ...(Array.isArray(result?.synonyms) ? result.synonyms : []),
          ]);
          for (const alias of aliases) {
            const normalized = this.normalizeTitle(alias);
            if (normalized && !existingByAlias.has(normalized)) {
              existingByAlias.set(normalized, { item, aliases });
            }
          }
        });
        return;
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.response?.status || 0);
        if (status === 404) {
          if (batch.length === 1) {
            this.logger.warn(
              `MAL title aliases were unavailable for id ${batch[0].malId}`
            );
            return;
          }
          const middle = Math.ceil(batch.length / 2);
          await Promise.all([
            this.hydrateAnimeAliasBatch(
              batch.slice(0, middle),
              existingByAlias
            ),
            this.hydrateAnimeAliasBatch(batch.slice(middle), existingByAlias),
          ]);
          return;
        }
        const retryable = status === 0 || status === 429 || status >= 500;
        if (!retryable || attempt === 2) break;
        const retryAfter = Number(
          error?.response?.headers?.["retry-after"] || 0
        );
        await this.pause(
          retryAfter > 0 ? retryAfter * 1000 : 100 * (attempt + 1)
        );
      }
    }
    const reason =
      lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.warn(`TV Time title matching failed after retries: ${reason}`);
    throw new Error(
      "TV Time title matching is temporarily unavailable. Retry the preview."
    );
  }

  private applyAnimeMatch(
    item: ImportPreviewItem,
    match: any,
    aliases: string[]
  ): void {
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
    aired: number | null,
    type: MediaType
  ): MediaStatus {
    const relationship = raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (relationship === "up_to_date") {
      return type === MediaType.MOVIE
        ? MediaStatus.COMPLETED
        : MediaStatus.WATCHING;
    }
    if (relationship === "continuing") return MediaStatus.WATCHING;
    if (relationship === "stopped" || relationship === "on_hold")
      return MediaStatus.PAUSED;
    if (relationship === "dropped") return MediaStatus.DROPPED;
    if (relationship === "not_started_yet" || relationship === "watch_later") {
      return MediaStatus.PLANNING;
    }
    // If ended and all episodes seen
    if (raw.includes("ended") && aired && seen >= aired)
      return MediaStatus.COMPLETED;
    // Up to date on a continuing show
    if (upToDate && raw.includes("continuing")) return MediaStatus.WATCHING;
    // Continuing but not up to date
    if (raw.includes("continuing") && seen > 0) return MediaStatus.WATCHING;
    // Ended but not all seen
    if (raw.includes("ended") && seen > 0 && aired && seen < aired)
      return MediaStatus.PAUSED;
    // No episodes seen
    if (seen === 0) return MediaStatus.PLANNING;
    return MediaStatus.WATCHING;
  }

  private progressMode(
    type: MediaType,
    rawStatus: string,
    upToDate: boolean,
    hasSeenEpisodes: boolean
  ): "exact" | "all-aired" | "unknown-partial" | "none" | "complete" {
    if (type === MediaType.MOVIE) {
      return rawStatus === "up_to_date" ? "complete" : "none";
    }
    if (hasSeenEpisodes) return "exact";
    if (rawStatus === "up_to_date" || upToDate) return "all-aired";
    if (["not_started_yet", "watch_later"].includes(rawStatus)) return "none";
    return "unknown-partial";
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
    return [
      ...new Set(
        titles.filter(
          (title): title is string =>
            typeof title === "string" && !!title.trim()
        )
      ),
    ];
  }

  private pause(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
