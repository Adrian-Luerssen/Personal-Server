import { Injectable, Logger } from "@nestjs/common";
import { MediaType, MediaStatus } from "../entities/media-item.entity";
import { ImportPreviewItem } from "./mal-import.service";

@Injectable()
export class TvTimeImportService {
  private readonly logger = new Logger(TvTimeImportService.name);

  async parseCsv(buffer: Buffer): Promise<ImportPreviewItem[]> {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
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

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (cols.length <= nameIdx) continue;

      const title = cols[nameIdx]?.trim();
      if (!title) continue;

      const rawStatus = statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() : "";
      const seenEpisodes = seenIdx >= 0 ? parseInt(cols[seenIdx]) || 0 : 0;
      const airedEpisodes = airedIdx >= 0 ? parseInt(cols[airedIdx]) || null : null;
      const runtime = runtimeIdx >= 0 ? parseInt(cols[runtimeIdx]) || null : null;
      const posterUrl = posterIdx >= 0 ? cols[posterIdx]?.trim() || null : null;
      const upToDate = upToDateIdx >= 0 ? cols[upToDateIdx]?.trim().toLowerCase() === "true" : false;
      const archived = archivedIdx >= 0 ? cols[archivedIdx]?.trim().toLowerCase() === "true" : false;

      const status = this.mapStatus(rawStatus, upToDate, seenEpisodes, airedEpisodes);

      items.push({
        title,
        type: MediaType.TV,
        status,
        rating: null,
        externalIds: {},
        metadata: {
          episodes: airedEpisodes,
          episodesWatched: seenEpisodes,
          runtime,
          archived,
        },
        coverUrl: posterUrl,
      } as any);
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
      const h = headers[i].trim().toLowerCase();
      if (candidates.some((c) => h === c || h.includes(c))) return i;
    }
    return -1;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
