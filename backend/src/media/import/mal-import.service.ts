import { Injectable, Logger } from "@nestjs/common";
import { MediaType, MediaStatus } from "../entities/media-item.entity";
import { parseString } from "xml2js";
import { promisify } from "util";

const parseXml = promisify(parseString);

export interface ImportPreviewItem {
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number | null;
  metadata: Record<string, any>;
  externalIds: Record<string, any>;
}

@Injectable()
export class MalImportService {
  private readonly logger = new Logger(MalImportService.name);

  async parseExport(
    buffer: Buffer,
    mediaType: "anime" | "manga"
  ): Promise<ImportPreviewItem[]> {
    const xml = buffer.toString("utf-8");
    const parsed: any = await parseXml(xml);

    const root =
      mediaType === "anime"
        ? parsed?.myanimelist?.anime
        : parsed?.myanimelist?.manga;

    if (!root || !Array.isArray(root)) {
      return [];
    }

    return root.map((entry: any) => this.mapEntry(entry, mediaType));
  }

  private mapEntry(
    entry: any,
    mediaType: "anime" | "manga"
  ): ImportPreviewItem {
    const getText = (field: any): string =>
      Array.isArray(field) ? field[0] || "" : field || "";

    const title = getText(entry.series_title);
    const malId = parseInt(getText(entry.series_animedb_id || entry.series_mangadb_id)) || null;
    const score = parseInt(getText(entry.my_score)) || null;
    const rating = score && score > 0 ? score : null;

    const statusMap: Record<string, MediaStatus> = {
      "Watching": MediaStatus.WATCHING,
      "Reading": MediaStatus.READING,
      "Completed": MediaStatus.COMPLETED,
      "On-Hold": MediaStatus.PAUSED,
      "Dropped": MediaStatus.DROPPED,
      "Plan to Watch": MediaStatus.PLANNING,
      "Plan to Read": MediaStatus.PLANNING,
    };

    const rawStatus = getText(entry.my_status);
    const status = statusMap[rawStatus] || MediaStatus.PLANNING;

    if (mediaType === "anime") {
      return {
        title,
        type: MediaType.ANIME,
        status,
        rating,
        externalIds: malId ? { malId } : {},
        metadata: {
          episodes: parseInt(getText(entry.series_episodes)) || null,
          episodesWatched: parseInt(getText(entry.my_watched_episodes)) || 0,
          genres: [],
        },
      };
    } else {
      return {
        title,
        type: MediaType.MANGA,
        status,
        rating,
        externalIds: malId ? { malId } : {},
        metadata: {
          chapters: parseInt(getText(entry.series_chapters)) || null,
          volumes: parseInt(getText(entry.series_volumes)) || null,
          chaptersRead: parseInt(getText(entry.my_read_chapters)) || 0,
          volumesRead: parseInt(getText(entry.my_read_volumes)) || 0,
          genres: [],
        },
      };
    }
  }
}
