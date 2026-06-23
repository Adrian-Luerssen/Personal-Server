import { Injectable, Logger } from "@nestjs/common";
import { MediaType, MediaStatus } from "../entities/media-item.entity";
import { parseString } from "xml2js";
import { promisify } from "util";
import { gunzipSync } from "zlib";

const parseXml = promisify(parseString);

export interface ImportPreviewItem {
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number | null;
  coverUrl?: string | null;
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
    let xml: string;

    // MAL exports may be gzipped
    try {
      const decompressed = gunzipSync(buffer);
      xml = decompressed.toString("utf-8");
    } catch {
      // Not gzipped, use raw buffer
      xml = buffer.toString("utf-8");
    }

    this.logger.debug(`Parsing MAL ${mediaType} XML (${xml.length} chars)`);

    let parsed: any;
    try {
      parsed = await parseXml(xml);
    } catch (err) {
      this.logger.error(`Failed to parse XML: ${err}`);
      throw new Error(`Invalid XML file: ${err instanceof Error ? err.message : err}`);
    }

    if (!parsed) {
      this.logger.warn("Parsed XML is empty");
      return [];
    }

    // Log root keys for debugging
    const rootKeys = Object.keys(parsed);
    this.logger.debug(`XML root keys: ${rootKeys.join(", ")}`);

    const root =
      mediaType === "anime"
        ? parsed?.myanimelist?.anime
        : parsed?.myanimelist?.manga;

    if (!root || !Array.isArray(root)) {
      this.logger.warn(
        `No ${mediaType} array found in XML. Root keys: ${rootKeys.join(", ")}. ` +
        `myanimelist keys: ${parsed?.myanimelist ? Object.keys(parsed.myanimelist).join(", ") : "N/A"}`
      );
      return [];
    }

    this.logger.log(`Found ${root.length} ${mediaType} entries`);
    return root.map((entry: any) => this.mapEntry(entry, mediaType));
  }

  private mapEntry(
    entry: any,
    mediaType: "anime" | "manga"
  ): ImportPreviewItem {
    const getText = (field: any): string =>
      Array.isArray(field) ? field[0] || "" : field || "";

    // Anime uses series_title/series_animedb_id, manga uses manga_title/manga_mangadb_id
    const title =
      getText(entry.series_title) || getText(entry.manga_title) || "";
    const malId =
      parseInt(getText(entry.series_animedb_id)) ||
      parseInt(getText(entry.manga_mangadb_id)) ||
      null;
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
          importSource: "mal",
          sourceType: "anime",
          tags: ["anime"],
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
          importSource: "mal",
          sourceType: "manga",
          tags: ["manga"],
          chapters: parseInt(getText(entry.manga_chapters)) || null,
          volumes: parseInt(getText(entry.manga_volumes)) || null,
          chaptersRead: parseInt(getText(entry.my_read_chapters)) || 0,
          volumesRead: parseInt(getText(entry.my_read_volumes)) || 0,
          genres: [],
        },
      };
    }
  }
}
