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
    const titleIdx = this.findColumn(headers, ["title", "name", "series"]);
    const typeIdx = this.findColumn(headers, ["type", "media_type"]);
    const statusIdx = this.findColumn(headers, ["status", "tracking_status"]);
    const ratingIdx = this.findColumn(headers, ["rating", "score"]);

    if (titleIdx === -1) {
      this.logger.warn("Could not find title column in TVTime CSV");
      return [];
    }

    const itemMap = new Map<string, ImportPreviewItem>();

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (cols.length <= titleIdx) continue;

      const title = cols[titleIdx]?.trim();
      if (!title) continue;

      // Deduplicate by title (TVTime exports per-episode rows)
      if (itemMap.has(title)) continue;

      const rawType = typeIdx >= 0 ? cols[typeIdx]?.trim().toLowerCase() : "";
      const type = rawType === "movie" ? MediaType.MOVIE : MediaType.TV;

      const rawStatus = statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() : "";
      const status = this.mapStatus(rawStatus);

      const rawRating = ratingIdx >= 0 ? parseFloat(cols[ratingIdx]) : NaN;
      const rating = !isNaN(rawRating) && rawRating > 0 ? rawRating : null;

      itemMap.set(title, {
        title,
        type,
        status,
        rating,
        externalIds: {},
        metadata: type === MediaType.TV ? { episodesWatched: 0 } : {},
      });
    }

    return Array.from(itemMap.values());
  }

  private mapStatus(raw: string): MediaStatus {
    if (raw.includes("watch") || raw.includes("current")) return MediaStatus.WATCHING;
    if (raw.includes("complet") || raw.includes("finish")) return MediaStatus.COMPLETED;
    if (raw.includes("drop")) return MediaStatus.DROPPED;
    if (raw.includes("hold") || raw.includes("paus")) return MediaStatus.PAUSED;
    return MediaStatus.PLANNING;
  }

  private findColumn(headers: string[], candidates: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim().toLowerCase().replace(/[^a-z_]/g, "");
      if (candidates.some((c) => h.includes(c))) return i;
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
