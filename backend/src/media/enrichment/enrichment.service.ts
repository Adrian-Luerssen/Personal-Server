import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import axios from "axios";
import { MediaItem, MediaType } from "../entities/media-item.entity";

@Injectable()
export class MediaEnrichmentService {
  private readonly logger = new Logger(MediaEnrichmentService.name);
  private running = false;

  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>
  ) {}

  // Run every 2 minutes
  @Cron(CronExpression.EVERY_MINUTE)
  async enrichPending() {
    if (this.running) return;
    this.running = true;

    try {
      // Find items missing cover art (up to 5 per cycle to respect rate limits)
      const pending = await this.mediaRepo.find({
        where: { coverUrl: IsNull() },
        take: 5,
        order: { createdAt: "ASC" },
      });

      if (pending.length === 0) return;

      this.logger.log(`Enriching ${pending.length} media items...`);

      for (const item of pending) {
        try {
          await this.enrichItem(item);
          // Jikan rate limit: ~3 req/s, be conservative
          await this.sleep(1500);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to enrich "${item.title}": ${msg}`);
          // Mark as attempted so we don't retry forever — set empty string
          item.coverUrl = "";
          await this.mediaRepo.save(item);
        }
      }
    } catch (err) {
      this.logger.error(`Enrichment cycle failed: ${err}`);
    } finally {
      this.running = false;
    }
  }

  private async enrichItem(item: MediaItem): Promise<void> {
    if (item.type === MediaType.ANIME || item.type === MediaType.MANGA) {
      await this.enrichFromJikan(item);
    } else if (item.type === MediaType.TV || item.type === MediaType.MOVIE) {
      await this.enrichFromTmdb(item);
    } else if (item.type === MediaType.BOOK) {
      await this.enrichFromOpenLibrary(item);
    }
  }

  // ========== JIKAN (anime/manga) ==========

  private async enrichFromJikan(item: MediaItem): Promise<void> {
    const malId = item.externalIds?.malId;
    const jikanType = item.type === MediaType.ANIME ? "anime" : "manga";

    let data: any;

    if (malId) {
      // Direct lookup by MAL ID
      const resp = await axios.get(
        `https://api.jikan.moe/v4/${jikanType}/${malId}`,
        { timeout: 10000 }
      );
      data = resp.data?.data;
    } else {
      // Search by title
      const resp = await axios.get(
        `https://api.jikan.moe/v4/${jikanType}`,
        { params: { q: item.title, limit: 1 }, timeout: 10000 }
      );
      data = resp.data?.data?.[0];
    }

    if (!data) {
      this.logger.debug(`No Jikan result for "${item.title}"`);
      item.coverUrl = "";
      await this.mediaRepo.save(item);
      return;
    }

    const coverUrl =
      data.images?.jpg?.large_image_url ||
      data.images?.jpg?.image_url ||
      null;

    const updates: Partial<MediaItem> = {};
    if (coverUrl) updates.coverUrl = coverUrl;

    // Enrich metadata
    const newMeta = { ...item.metadata };
    const genres = (data.genres || []).map((g: any) => g.name);
    if (genres.length > 0) newMeta.genres = genres;

    if (item.type === MediaType.ANIME) {
      if (data.episodes && !newMeta.episodes) newMeta.episodes = data.episodes;
    } else {
      if (data.chapters && !newMeta.chapters) newMeta.chapters = data.chapters;
      if (data.volumes && !newMeta.volumes) newMeta.volumes = data.volumes;
    }

    updates.metadata = newMeta;

    // Store MAL ID if we found it via search
    if (!item.externalIds?.malId && data.mal_id) {
      updates.externalIds = { ...item.externalIds, malId: data.mal_id };
    }

    Object.assign(item, updates);
    await this.mediaRepo.save(item);
    this.logger.debug(`Enriched "${item.title}" with cover from Jikan`);
  }

  // ========== TMDB (tv/movie) ==========

  private async enrichFromTmdb(item: MediaItem): Promise<void> {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) {
      item.coverUrl = "";
      await this.mediaRepo.save(item);
      return;
    }

    const tmdbId = item.externalIds?.tmdbId;
    const tmdbType = item.type === MediaType.MOVIE ? "movie" : "tv";

    let data: any;

    if (tmdbId) {
      const resp = await axios.get(
        `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}`,
        { params: { api_key: tmdbKey }, timeout: 10000 }
      );
      data = resp.data;
    } else {
      const resp = await axios.get(
        `https://api.themoviedb.org/3/search/${tmdbType}`,
        { params: { api_key: tmdbKey, query: item.title, page: 1 }, timeout: 10000 }
      );
      data = resp.data?.results?.[0];
    }

    if (!data) {
      item.coverUrl = "";
      await this.mediaRepo.save(item);
      return;
    }

    if (data.poster_path) {
      item.coverUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    } else {
      item.coverUrl = "";
    }

    if (!item.externalIds?.tmdbId && data.id) {
      item.externalIds = { ...item.externalIds, tmdbId: data.id };
    }

    await this.mediaRepo.save(item);
    this.logger.debug(`Enriched "${item.title}" with cover from TMDB`);
  }

  // ========== OPEN LIBRARY (books) ==========

  private async enrichFromOpenLibrary(item: MediaItem): Promise<void> {
    const isbn = item.externalIds?.isbn;

    let data: any;

    if (isbn) {
      const resp = await axios.get(
        `https://openlibrary.org/search.json`,
        { params: { isbn, limit: 1 }, timeout: 10000 }
      );
      data = resp.data?.docs?.[0];
    } else {
      const resp = await axios.get(
        `https://openlibrary.org/search.json`,
        { params: { q: item.title, limit: 1 }, timeout: 10000 }
      );
      data = resp.data?.docs?.[0];
    }

    if (!data) {
      item.coverUrl = "";
      await this.mediaRepo.save(item);
      return;
    }

    if (data.cover_i) {
      item.coverUrl = `https://covers.openlibrary.org/b/id/${data.cover_i}-L.jpg`;
    } else {
      item.coverUrl = "";
    }

    const newMeta = { ...item.metadata };
    if (data.author_name && (!newMeta.authors || newMeta.authors.length === 0)) {
      newMeta.authors = data.author_name;
    }
    if (data.number_of_pages_median && !newMeta.pages) {
      newMeta.pages = data.number_of_pages_median;
    }
    item.metadata = newMeta;

    if (!item.externalIds?.openLibraryKey && data.key) {
      item.externalIds = { ...item.externalIds, openLibraryKey: data.key };
    }

    await this.mediaRepo.save(item);
    this.logger.debug(`Enriched "${item.title}" with cover from OpenLibrary`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
