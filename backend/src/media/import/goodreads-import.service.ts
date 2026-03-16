import { Injectable, Logger } from "@nestjs/common";
import { MediaType, MediaStatus } from "../entities/media-item.entity";
import { ImportPreviewItem } from "./mal-import.service";

@Injectable()
export class GoodreadsImportService {
  private readonly logger = new Logger(GoodreadsImportService.name);

  async parseCsv(buffer: Buffer): Promise<ImportPreviewItem[]> {
    const text = buffer.toString("utf-8");
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const titleIdx = this.findColumn(headers, ["title"]);
    const authorIdx = this.findColumn(headers, ["author"]);
    const ratingIdx = this.findColumn(headers, ["my rating"]);
    const shelfIdx = this.findColumn(headers, ["exclusive shelf", "bookshelves"]);
    const pagesIdx = this.findColumn(headers, ["number of pages"]);
    const isbnIdx = this.findColumn(headers, ["isbn13", "isbn"]);

    if (titleIdx === -1) {
      this.logger.warn("Could not find title column in Goodreads CSV");
      return [];
    }

    const items: ImportPreviewItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (cols.length <= titleIdx) continue;

      const title = cols[titleIdx]?.trim().replace(/^=?"/, "").replace(/"$/, "");
      if (!title) continue;

      const author = authorIdx >= 0 ? cols[authorIdx]?.trim() : null;
      const rawRating = ratingIdx >= 0 ? parseFloat(cols[ratingIdx]) : NaN;
      const rating = !isNaN(rawRating) && rawRating > 0 ? rawRating * 2 : null; // Goodreads 1-5 → 2-10
      const shelf = shelfIdx >= 0 ? cols[shelfIdx]?.trim().toLowerCase() : "";
      const pages = pagesIdx >= 0 ? parseInt(cols[pagesIdx]) || null : null;
      const isbn = isbnIdx >= 0 ? cols[isbnIdx]?.trim().replace(/[="]/g, "") : null;

      const status = this.mapStatus(shelf);

      items.push({
        title,
        type: MediaType.BOOK,
        status,
        rating,
        externalIds: isbn ? { isbn } : {},
        metadata: {
          authors: author ? [author] : [],
          pages,
          pagesRead: status === MediaStatus.COMPLETED ? pages : 0,
        },
      });
    }

    return items;
  }

  private mapStatus(shelf: string): MediaStatus {
    if (shelf.includes("read") && !shelf.includes("to-read") && !shelf.includes("currently"))
      return MediaStatus.COMPLETED;
    if (shelf.includes("currently")) return MediaStatus.READING;
    if (shelf.includes("to-read") || shelf.includes("want")) return MediaStatus.PLANNING;
    if (shelf.includes("dnf") || shelf.includes("drop")) return MediaStatus.DROPPED;
    return MediaStatus.PLANNING;
  }

  private findColumn(headers: string[], candidates: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim().toLowerCase();
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
