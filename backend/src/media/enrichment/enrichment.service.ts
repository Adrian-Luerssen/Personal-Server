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
      // Priority 1: Items missing cover art
      let pending = await this.mediaRepo.find({
        where: { coverUrl: IsNull() },
        take: 5,
        order: { createdAt: "ASC" },
      });

      // Priority 2: Items missing synopsis (need full enrichment)
      if (pending.length === 0) {
        pending = await this.mediaRepo
          .createQueryBuilder("m")
          .where("m.coverUrl IS NOT NULL AND m.coverUrl != ''")
          .andWhere("(m.metadata->>'synopsis') IS NULL")
          .orderBy("m.createdAt", "ASC")
          .take(5)
          .getMany();
      }

      // Priority 3: TV items that might be anime (need reclassification)
      if (pending.length === 0) {
        pending = await this.mediaRepo
          .createQueryBuilder("m")
          .where("m.type = :type", { type: "tv" })
          .andWhere("(m.metadata->>'reclassified') IS NULL")
          .orderBy("m.createdAt", "ASC")
          .take(5)
          .getMany();
      }

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
    if (item.type === MediaType.BOOK) {
      await this.enrichFromOpenLibrary(item);
      return;
    }
    if (item.type === MediaType.MANGA) {
      await this.enrichFromJikan(item);
      return;
    }

    // For anime, tv, and movie: try Jikan first to detect anime
    // This reclassifies TVTime/other imports that may be anime
    const jikanMatch = await this.tryJikanClassify(item);
    if (jikanMatch) {
      return; // Already saved inside tryJikanClassify
    }

    // Not found on Jikan → it's a regular TV show or movie
    if (item.type === MediaType.TV || item.type === MediaType.MOVIE || item.type === MediaType.ANIME) {
      await this.enrichFromTmdb(item);
    }
  }

  /**
   * Try to find the item on Jikan. If found, reclassify as anime and enrich.
   * Returns true if a match was found, false otherwise.
   */
  private async tryJikanClassify(item: MediaItem): Promise<boolean> {
    const malId = item.externalIds?.malId;

    try {
      let data: any;

      if (malId) {
        const resp = await axios.get(
          `https://api.jikan.moe/v4/anime/${malId}`,
          { timeout: 10000 }
        );
        data = resp.data?.data;
      } else {
        // Search by title on anime endpoint
        const resp = await axios.get(
          `https://api.jikan.moe/v4/anime`,
          { params: { q: item.title, limit: 3 }, timeout: 10000 }
        );
        const results = resp.data?.data || [];
        // Find a strong title match
        data = results.find((r: any) => {
          const t = (r.title || "").toLowerCase();
          const te = (r.title_english || "").toLowerCase();
          const it = item.title.toLowerCase();
          return t === it || te === it || t.includes(it) || it.includes(t);
        });
      }

      if (!data) return false;

      // Found on Jikan → this is anime. Reclassify.
      const oldType = item.type;
      item.type = MediaType.ANIME;

      const coverUrl =
        data.images?.jpg?.large_image_url ||
        data.images?.jpg?.image_url ||
        null;
      if (coverUrl) item.coverUrl = coverUrl;

      const newMeta = { ...item.metadata };

      // Store the format (TV, Movie, OVA, Special, ONA, Music)
      if (data.type) newMeta.mediaFormat = data.type;

      if (data.synopsis) newMeta.synopsis = data.synopsis;
      if (data.score) newMeta.malScore = data.score;
      if (data.year) newMeta.year = data.year;
      if (data.aired?.from) newMeta.year = newMeta.year || new Date(data.aired.from).getFullYear();
      if (data.status) newMeta.airingStatus = data.status;
      if (data.episodes && !newMeta.episodes) newMeta.episodes = data.episodes;

      const genres = (data.genres || []).map((g: any) => g.name);
      if (genres.length > 0) newMeta.genres = genres;
      const studios = (data.studios || []).map((s: any) => s.name);
      if (studios.length > 0) newMeta.studios = studios;
      const themes = (data.themes || []).map((t: any) => t.name);
      if (themes.length > 0) newMeta.themes = themes;
      const demographics = (data.demographics || []).map((d: any) => d.name);
      if (demographics.length > 0) newMeta.demographics = demographics;

      if (data.source) newMeta.source = data.source;
      if (data.duration) newMeta.duration = data.duration;
      if (data.rating) newMeta.ageRating = data.rating;
      newMeta.reclassified = true;

      item.metadata = newMeta;

      if (!item.externalIds?.malId && data.mal_id) {
        item.externalIds = { ...item.externalIds, malId: data.mal_id };
      }

      await this.mediaRepo.save(item);

      if (oldType !== MediaType.ANIME) {
        this.logger.log(`Reclassified "${item.title}" from ${oldType} → anime (${data.type || "unknown format"})`);
      } else {
        this.logger.debug(`Enriched "${item.title}" with cover + metadata from Jikan`);
      }

      return true;
    } catch (err) {
      // 404 = not found on Jikan, that's fine
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return false;
      }
      // Rate limited or other error — don't reclassify, let it retry later
      throw err;
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

    if (data.synopsis) newMeta.synopsis = data.synopsis;
    if (data.score) newMeta.malScore = data.score;
    if (data.year) newMeta.year = data.year;
    if (data.aired?.from) newMeta.year = newMeta.year || new Date(data.aired.from).getFullYear();
    if (data.published?.from) newMeta.year = newMeta.year || new Date(data.published.from).getFullYear();
    if (data.status) newMeta.airingStatus = data.status;

    // Studios (anime) or authors (manga)
    const studios = (data.studios || []).map((s: any) => s.name);
    if (studios.length > 0) newMeta.studios = studios;
    const authors = (data.authors || []).map((a: any) => a.name);
    if (authors.length > 0) newMeta.authors = authors;

    // Themes & demographics
    const themes = (data.themes || []).map((t: any) => t.name);
    if (themes.length > 0) newMeta.themes = themes;
    const demographics = (data.demographics || []).map((d: any) => d.name);
    if (demographics.length > 0) newMeta.demographics = demographics;

    if (data.type) newMeta.mediaFormat = data.type; // TV, OVA, Movie, Manga, etc.
    if (data.source) newMeta.source = data.source; // Manga, Light novel, Original, etc.
    if (data.duration) newMeta.duration = data.duration;
    if (data.rating) newMeta.ageRating = data.rating;

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
    this.logger.debug(`Enriched "${item.title}" with cover + metadata from Jikan`);
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
      item.metadata = { ...item.metadata, reclassified: true };
      await this.mediaRepo.save(item);
      return;
    }

    if (data.poster_path) {
      item.coverUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    } else {
      item.coverUrl = "";
    }

    const newMeta = { ...item.metadata };
    if (data.overview) newMeta.synopsis = data.overview;
    if (data.vote_average) newMeta.tmdbScore = data.vote_average;
    if (data.release_date) newMeta.year = new Date(data.release_date).getFullYear();
    if (data.first_air_date) newMeta.year = newMeta.year || new Date(data.first_air_date).getFullYear();
    if (data.status) newMeta.airingStatus = data.status;

    const genres = (data.genres || data.genre_ids || []);
    if (genres.length > 0 && typeof genres[0] === "object") {
      newMeta.genres = genres.map((g: any) => g.name);
    }

    if (data.number_of_seasons) newMeta.seasons = data.number_of_seasons;
    if (data.number_of_episodes) newMeta.episodes = data.number_of_episodes;
    if (data.runtime) newMeta.runtime = data.runtime;
    if (data.tagline) newMeta.tagline = data.tagline;

    // Production companies
    const companies = (data.production_companies || []).map((c: any) => c.name);
    if (companies.length > 0) newMeta.studios = companies;

    item.metadata = newMeta;

    if (!item.externalIds?.tmdbId && data.id) {
      item.externalIds = { ...item.externalIds, tmdbId: data.id };
    }

    // Mark as reclassified so we don't re-check
    item.metadata = { ...item.metadata, reclassified: true };
    await this.mediaRepo.save(item);
    this.logger.debug(`Enriched "${item.title}" with cover + metadata from TMDB`);
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
    if (data.first_publish_year) newMeta.year = data.first_publish_year;
    if (data.subject && (!newMeta.genres || newMeta.genres.length === 0)) {
      newMeta.genres = data.subject.slice(0, 8);
    }
    if (data.publisher && data.publisher.length > 0) {
      newMeta.publisher = data.publisher[0];
    }
    if (data.language && data.language.length > 0) {
      newMeta.language = data.language[0];
    }
    item.metadata = newMeta;

    if (!item.externalIds?.openLibraryKey && data.key) {
      item.externalIds = { ...item.externalIds, openLibraryKey: data.key };
    }

    await this.mediaRepo.save(item);
    this.logger.debug(`Enriched "${item.title}" with cover + metadata from OpenLibrary`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
