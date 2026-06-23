import { Injectable, Logger } from "@nestjs/common";
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

  private mapStatus(
    raw: string,
    upToDate: boolean,
    seen: number,
    aired: number | null
  ): MediaStatus {
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
