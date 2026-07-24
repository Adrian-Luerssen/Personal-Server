import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Repository } from "typeorm";
import { Account } from "../../system/accounts/account.entity";
import { MediaEpisode } from "../entities/media-episode.entity";
import {
  MediaItem,
  MediaStatus,
  MediaType,
} from "../entities/media-item.entity";
import {
  MediaRelation,
  MediaRelationType,
} from "../entities/media-relation.entity";
import { MediaSeason } from "../entities/media-season.entity";
import { withMediaClassifications } from "../media/media-classification";

const TMDB_IMAGE_ROOT = "https://image.tmdb.org/t/p/w500";
const CATALOG_SCHEMA_VERSION = 2;

export interface MediaCatalogView {
  item: MediaItem;
  seasons: Array<MediaSeason & { episodes: MediaEpisode[] }>;
  relations: MediaRelation[];
  progress: {
    watched: number;
    total: number | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  };
  nextEpisode: MediaEpisode | null;
  upcomingEpisode: MediaEpisode | null;
}

export interface ImportedCatalogSyncProgress {
  current: number;
  total: number;
  synced: number;
  failed: number;
  item: MediaItem;
}

@Injectable()
export class MediaCatalogService {
  private readonly logger = new Logger(MediaCatalogService.name);
  private airingRefreshRunning = false;
  private readonly remainingSyncAccounts = new Set<string>();
  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    @InjectRepository(MediaSeason)
    private readonly seasonRepo: Repository<MediaSeason>,
    @InjectRepository(MediaEpisode)
    private readonly episodeRepo: Repository<MediaEpisode>,
    @InjectRepository(MediaRelation)
    private readonly relationRepo: Repository<MediaRelation>
  ) {}

  async syncItem(account: Account, item: MediaItem): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException(
        "The media item does not belong to this account"
      );
    }

    try {
      if (item.type === MediaType.TV) {
        await this.syncTmdbSeries(account, item);
      } else if (item.type === MediaType.MOVIE) {
        await this.syncTmdbMovie(item);
      } else if (item.type === MediaType.ANIME) {
        await this.syncAnimeRelations(account, item);
      } else {
        throw new BadRequestException(
          "Structured catalog sync supports TV, movie, and anime titles"
        );
      }

      item.metadata = withMediaClassifications(item.type, {
        ...(item.metadata || {}),
        catalogSyncState: "ready",
        catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
        catalogSyncedAt: new Date().toISOString(),
        catalogSyncError: null,
      });
      await this.mediaRepo.save(item);
      return this.getCatalog(account, item);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      item.metadata = {
        ...(item.metadata || {}),
        catalogSyncState: "error",
        catalogSyncError: "Catalog provider could not be reached",
      };
      await this.mediaRepo.save(item);
      throw new ServiceUnavailableException(
        "Catalog synchronization failed. Existing progress is still available."
      );
    }
  }

  async syncImportedItems(
    account: Account,
    items: MediaItem[],
    onProgress?: (progress: ImportedCatalogSyncProgress) => void
  ): Promise<{ eligible: number; synced: number; failed: number }> {
    const eligible = items.filter(
      (item) =>
        (item.type === MediaType.ANIME &&
          Number(item.externalIds?.malId) > 0) ||
        [MediaType.TV, MediaType.MOVIE].includes(item.type)
    );
    let synced = 0;
    let failed = 0;
    let completed = 0;
    let nextIndex = 0;
    let nextAnimeStart = 0;

    const takeNext = () => {
      const index = nextIndex++;
      return index < eligible.length ? eligible[index] : null;
    };
    const waitForAnimeSlot = async () => {
      const now = Date.now();
      const wait = Math.max(0, nextAnimeStart - now);
      nextAnimeStart = Math.max(now, nextAnimeStart) + 375;
      if (wait) await this.pause(wait);
    };
    const worker = async () => {
      for (let item = takeNext(); item; item = takeNext()) {
        if (item.type === MediaType.ANIME) await waitForAnimeSlot();
        try {
          await this.syncItem(account, item);
          synced++;
        } catch {
          failed++;
        }
        completed++;
        onProgress?.({
          current: completed,
          total: eligible.length,
          synced,
          failed,
          item,
        });
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(4, eligible.length) }, () => worker())
    );

    return { eligible: eligible.length, synced, failed };
  }

  async syncRemainingItems(
    account: Account
  ): Promise<{ eligible: number; synced: number; failed: number }> {
    if (this.remainingSyncAccounts.has(account.id)) {
      throw new BadRequestException(
        "A remaining-show synchronization is already running"
      );
    }
    this.remainingSyncAccounts.add(account.id);
    try {
      const accountItems = await this.mediaRepo.find({
        where: { accountId: account.id },
      });
      const [accountSeasons, accountEpisodes] = await Promise.all([
        this.seasonRepo.find({ where: { accountId: account.id } }),
        this.episodeRepo.find({ where: { accountId: account.id } }),
      ]);
      const remaining = accountItems.filter((item) => {
        const eligible =
          (item.type === MediaType.ANIME &&
            Number(item.externalIds?.malId) > 0) ||
          item.type === MediaType.TV;
        return (
          eligible &&
          this.needsCatalogSync(item, accountSeasons, accountEpisodes)
        );
      });
      return await this.syncImportedItems(account, remaining);
    } finally {
      this.remainingSyncAccounts.delete(account.id);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async refreshAiringCatalogs(): Promise<void> {
    if (this.airingRefreshRunning) return;
    this.airingRefreshRunning = true;
    try {
      const items = await this.mediaRepo.find();
      const staleBefore = Date.now() - 20 * 60 * 60 * 1000;
      const staleAiring = items.filter((item) => {
        if (!this.isAiringStatus(item.metadata?.airingStatus)) return false;
        const syncedAt = Date.parse(item.metadata?.catalogSyncedAt || "");
        return !Number.isFinite(syncedAt) || syncedAt < staleBefore;
      });
      const byAccount = new Map<string, MediaItem[]>();
      for (const item of staleAiring) {
        const accountItems = byAccount.get(item.accountId) || [];
        accountItems.push(item);
        byAccount.set(item.accountId, accountItems);
      }
      for (const [accountId, accountItems] of byAccount) {
        const result = await this.syncImportedItems(
          { id: accountId } as Account,
          accountItems
        );
        this.logger.log(
          `Daily airing refresh for ${accountId}: ${result.synced} synced, ${result.failed} failed`
        );
      }
    } catch (error) {
      this.logger.error(
        `Daily airing refresh failed: ${
          error instanceof Error ? error.message : error
        }`
      );
    } finally {
      this.airingRefreshRunning = false;
    }
  }

  private isAiringStatus(value: unknown): boolean {
    const status = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    return [
      "currently airing",
      "releasing",
      "returning series",
      "in production",
    ].includes(status);
  }

  private needsCatalogSync(
    item: MediaItem,
    seasons: MediaSeason[],
    episodes: MediaEpisode[]
  ): boolean {
    if (
      item.metadata?.catalogSyncState !== "ready" ||
      Number(item.metadata?.catalogSchemaVersion) !== CATALOG_SCHEMA_VERSION
    ) {
      return true;
    }

    if (
      item.type === MediaType.ANIME &&
      String(item.metadata?.mediaFormat || "")
        .trim()
        .toLowerCase() === "movie"
    ) {
      return false;
    }

    const itemSeasons = seasons.filter(
      (season) => season.mediaItemId === item.id && season.number > 0
    );
    const itemEpisodes = episodes.filter(
      (episode) => episode.mediaItemId === item.id && episode.seasonNumber > 0
    );
    const expectedEpisodes = Number(item.metadata?.episodes);
    if (
      Number.isInteger(expectedEpisodes) &&
      expectedEpisodes > 0 &&
      itemEpisodes.length < expectedEpisodes
    ) {
      return true;
    }

    if (item.type === MediaType.TV) {
      const expectedSeasons = Number(item.metadata?.seasons);
      if (
        Number.isInteger(expectedSeasons) &&
        expectedSeasons > 0 &&
        itemSeasons.length < expectedSeasons
      ) {
        return true;
      }
    } else if (
      item.type === MediaType.ANIME &&
      Number.isInteger(expectedEpisodes) &&
      expectedEpisodes > 0 &&
      itemSeasons.length === 0
    ) {
      return true;
    }

    return false;
  }

  async getCatalog(
    account: Account,
    item: MediaItem
  ): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException(
        "The media item does not belong to this account"
      );
    }

    const [seasons, episodes, relations] = await Promise.all([
      this.seasonRepo.find({
        where: { accountId: account.id, mediaItemId: item.id },
      }),
      this.episodeRepo.find({
        where: { accountId: account.id, mediaItemId: item.id },
      }),
      this.relationRepo.find({
        where: { accountId: account.id, sourceMediaItemId: item.id },
      }),
    ]);

    return this.buildCatalogView(item, seasons, episodes, relations);
  }

  async getCatalogSummaries(
    account: Account,
    items: MediaItem[]
  ): Promise<Record<string, MediaCatalogView>> {
    if (!items.length) return {};
    const [allSeasons, allEpisodes, allRelations] = await Promise.all([
      this.seasonRepo.find({ where: { accountId: account.id } }),
      this.episodeRepo.find({ where: { accountId: account.id } }),
      this.relationRepo.find({ where: { accountId: account.id } }),
    ]);
    return Object.fromEntries(
      items.map((item) => {
        const catalog = this.buildCatalogView(
          item,
          allSeasons.filter((season) => season.mediaItemId === item.id),
          allEpisodes.filter((episode) => episode.mediaItemId === item.id),
          allRelations.filter(
            (relation) => relation.sourceMediaItemId === item.id
          )
        );
        return [item.id, { ...catalog, seasons: [], relations: [] }];
      })
    );
  }

  async setEpisodeWatched(
    account: Account,
    item: MediaItem,
    episodeId: string,
    watched: boolean
  ): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException(
        "The media item does not belong to this account"
      );
    }
    const episode = await this.episodeRepo.findOne({
      where: {
        id: episodeId,
        accountId: account.id,
        mediaItemId: item.id,
      },
    });
    if (!episode) {
      throw new NotFoundException("Episode not found for this title");
    }

    episode.watched = watched;
    episode.watchedAt = watched ? new Date() : null;
    await this.episodeRepo.save(episode);

    return this.updateEpisodeProgress(account, item, watched);
  }

  async setSeasonWatched(
    account: Account,
    item: MediaItem,
    seasonNumber: number,
    watched: boolean
  ): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException(
        "The media item does not belong to this account"
      );
    }
    const seasonEpisodes = await this.episodeRepo.find({
      where: {
        accountId: account.id,
        mediaItemId: item.id,
        seasonNumber,
      },
    });
    if (!seasonEpisodes.length) {
      throw new NotFoundException("Season not found for this title");
    }

    const watchedAt = watched ? new Date() : null;
    for (const episode of seasonEpisodes) {
      episode.watched = watched;
      episode.watchedAt = watchedAt;
      await this.episodeRepo.save(episode);
    }

    return this.updateEpisodeProgress(account, item, watched);
  }

  private async updateEpisodeProgress(
    account: Account,
    item: MediaItem,
    watched: boolean
  ): Promise<MediaCatalogView> {
    const episodes = await this.episodeRepo.find({
      where: { accountId: account.id, mediaItemId: item.id },
    });
    const regularEpisodes = episodes.filter((entry) => entry.seasonNumber > 0);
    const watchedCount = regularEpisodes.filter(
      (entry) => entry.watched
    ).length;
    const today = new Date().toISOString().slice(0, 10);
    item.metadata = {
      ...(item.metadata || {}),
      episodesWatched: watchedCount,
    };

    if (watched && watchedCount > 0 && !item.startDate) {
      item.startDate = today;
      item.metadata.startDateSource = "episode-progress";
    }

    const statusCanFollowProgress =
      item.status === MediaStatus.PLANNING ||
      item.status === MediaStatus.WATCHING ||
      item.metadata?.trackingStatusSource === "episode-progress";
    if (statusCanFollowProgress) {
      const allWatched =
        regularEpisodes.length > 0 && watchedCount === regularEpisodes.length;
      item.status = allWatched ? MediaStatus.COMPLETED : MediaStatus.WATCHING;
      item.metadata.trackingStatusSource = "episode-progress";
      if (allWatched && !item.endDate) {
        item.endDate = today;
        item.metadata.endDateSource = "episode-progress";
      } else if (
        !allWatched &&
        item.metadata.endDateSource === "episode-progress"
      ) {
        item.endDate = null;
        delete item.metadata.endDateSource;
      }
    }
    await this.mediaRepo.save(item);
    return this.getCatalog(account, item);
  }

  private async syncTmdbSeries(
    account: Account,
    item: MediaItem
  ): Promise<void> {
    const tmdbKey = process.env.TMDB_API_KEY;
    let tmdbId = item.externalIds?.tmdbId;
    if (!tmdbKey)
      throw new ServiceUnavailableException("TMDB is not configured");
    if (!tmdbId) {
      tmdbId = await this.matchTmdbTitle(item, tmdbKey, "tv");
    }
    if (!tmdbId)
      throw new BadRequestException("This TV title is not matched to TMDB");

    const response = await axios.get(
      `https://api.themoviedb.org/3/tv/${tmdbId}`,
      {
        params: { api_key: tmdbKey },
        timeout: 10000,
      }
    );
    const details = response.data || {};
    const providerSeasons = Array.isArray(details.seasons)
      ? details.seasons
      : [];
    const firstStructuredSync = !item.metadata?.catalogSyncedAt;

    for (const providerSeason of providerSeasons) {
      const number = Number(providerSeason.season_number);
      if (!Number.isInteger(number) || number < 0) continue;
      let season = await this.seasonRepo.findOne({
        where: { accountId: account.id, mediaItemId: item.id, number },
      });
      season ||= this.seasonRepo.create({
        accountId: account.id,
        account,
        mediaItemId: item.id,
        mediaItem: item,
        number,
      });
      Object.assign(season, {
        providerSeasonId:
          providerSeason.id != null ? String(providerSeason.id) : undefined,
        name:
          providerSeason.name ||
          (number === 0 ? "Specials" : `Season ${number}`),
        overview: providerSeason.overview || null,
        posterUrl: providerSeason.poster_path
          ? `${TMDB_IMAGE_ROOT}${providerSeason.poster_path}`
          : null,
        airDate: providerSeason.air_date || null,
        episodeCount: providerSeason.episode_count ?? null,
      });
      season = await this.seasonRepo.save(season);

      const seasonResponse = await axios.get(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${number}`,
        {
          params: { api_key: tmdbKey },
          timeout: 10000,
        }
      );
      const providerEpisodes = Array.isArray(seasonResponse.data?.episodes)
        ? seasonResponse.data.episodes
        : [];

      for (const providerEpisode of providerEpisodes) {
        const episodeNumber = Number(providerEpisode.episode_number);
        if (!Number.isInteger(episodeNumber) || episodeNumber < 1) continue;
        let episode = await this.episodeRepo.findOne({
          where: {
            accountId: account.id,
            seasonId: season.id,
            number: episodeNumber,
          },
        });
        const existingWatched = episode?.watched ?? false;
        const existingWatchedAt = episode?.watchedAt ?? null;
        episode ||= this.episodeRepo.create({
          accountId: account.id,
          account,
          mediaItemId: item.id,
          mediaItem: item,
          seasonId: season.id,
          season,
          seasonNumber: number,
          number: episodeNumber,
          watched: false,
        });
        Object.assign(episode, {
          providerEpisodeId:
            providerEpisode.id != null ? String(providerEpisode.id) : undefined,
          seasonNumber: number,
          title: providerEpisode.name || `Episode ${episodeNumber}`,
          overview: providerEpisode.overview || null,
          airDate: providerEpisode.air_date || null,
          runtime: providerEpisode.runtime ?? null,
          imageUrl: providerEpisode.still_path
            ? `${TMDB_IMAGE_ROOT}${providerEpisode.still_path}`
            : null,
          watched: existingWatched,
          watchedAt: existingWatchedAt,
        });
        await this.episodeRepo.save(episode);
      }
    }

    if (firstStructuredSync) {
      const legacyCount = Math.max(
        0,
        Number(item.metadata?.episodesWatched) || 0
      );
      const episodes = await this.episodeRepo.find({
        where: { accountId: account.id, mediaItemId: item.id },
      });
      const regularEpisodes = episodes
        .filter((episode) => episode.seasonNumber > 0)
        .sort(
          (left, right) =>
            left.seasonNumber - right.seasonNumber || left.number - right.number
        );
      for (const episode of regularEpisodes.slice(0, legacyCount)) {
        if (!episode.watched) {
          episode.watched = true;
          episode.watchedAt = new Date();
          await this.episodeRepo.save(episode);
        }
      }
    }

    const allEpisodes = await this.episodeRepo.find({
      where: { accountId: account.id, mediaItemId: item.id },
    });
    const regularEpisodes = allEpisodes.filter(
      (episode) => episode.seasonNumber > 0
    );
    await this.applyTvTimeEpisodeProgress(
      item,
      regularEpisodes,
      details.status
    );
    const regularSeasonCount = providerSeasons.filter(
      (season) => Number(season.season_number) > 0
    ).length;
    item.metadata = {
      ...(item.metadata || {}),
      synopsis: details.overview || item.metadata?.synopsis,
      airingStatus: details.status || item.metadata?.airingStatus,
      seasons: regularSeasonCount,
      episodes: regularEpisodes.length,
      episodesWatched: regularEpisodes.filter((episode) => episode.watched)
        .length,
    };
  }

  private async syncTmdbMovie(item: MediaItem): Promise<void> {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey)
      throw new ServiceUnavailableException("TMDB is not configured");
    let tmdbId = item.externalIds?.tmdbId;
    if (!tmdbId) {
      tmdbId = await this.matchTmdbTitle(item, tmdbKey, "movie");
    }
    if (!tmdbId)
      throw new BadRequestException("This movie is not matched to TMDB");

    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      {
        params: { api_key: tmdbKey },
        timeout: 10000,
      }
    );
    const details = response.data || {};
    const releaseYear = Number(String(details.release_date || "").slice(0, 4));
    item.coverUrl = details.poster_path
      ? `${TMDB_IMAGE_ROOT}${details.poster_path}`
      : item.coverUrl;
    item.metadata = {
      ...(item.metadata || {}),
      synopsis: details.overview || item.metadata?.synopsis,
      airingStatus: details.status || item.metadata?.airingStatus,
      year:
        Number.isInteger(releaseYear) && releaseYear > 0
          ? releaseYear
          : item.metadata?.year,
      runtime: Number(details.runtime) || item.metadata?.runtime,
      tmdbScore: Number(details.vote_average) || item.metadata?.tmdbScore,
    };
  }

  private async matchTmdbTitle(
    item: MediaItem,
    tmdbKey: string,
    tmdbType: "tv" | "movie"
  ): Promise<number | null> {
    const title = String(item.title || "").trim();
    const trailingYear = title.match(/\s*[\[(]((?:19|20)\d{2})[\])]\s*$/);
    const year = trailingYear
      ? Number(trailingYear[1])
      : Number(item.metadata?.year) || null;
    const query = trailingYear
      ? title.slice(0, trailingYear.index).trim()
      : title;
    if (!query) return null;

    const response = await axios.get(
      `https://api.themoviedb.org/3/search/${tmdbType}`,
      {
        params: {
          api_key: tmdbKey,
          query,
          page: 1,
          ...(year
            ? tmdbType === "tv"
              ? { first_air_date_year: year }
              : { primary_release_year: year }
            : {}),
        },
        timeout: 10000,
      }
    );
    const results = Array.isArray(response.data?.results)
      ? response.data.results
      : [];
    const normalizedQuery = this.normalizeCatalogTitle(query);
    const exactMatches = results.filter((candidate: any) =>
      tmdbType === "tv"
        ? [candidate?.name, candidate?.original_name]
        : [candidate?.title, candidate?.original_title]
            .map((value) => this.normalizeCatalogTitle(value))
            .includes(normalizedQuery)
    );
    const match =
      exactMatches.find(
        (candidate: any) =>
          !year ||
          Number(
            String(
              tmdbType === "tv"
                ? candidate?.first_air_date
                : candidate?.release_date
            ).slice(0, 4)
          ) === year
      ) ||
      exactMatches[0] ||
      results[0];
    const matchedId = Number(match?.id);
    if (!Number.isInteger(matchedId) || matchedId <= 0) return null;

    item.externalIds = { ...(item.externalIds || {}), tmdbId: matchedId };
    item.metadata = {
      ...(item.metadata || {}),
      enrichmentStatus: "tmdb_matched",
    };
    await this.mediaRepo.save(item);
    return matchedId;
  }

  private normalizeCatalogTitle(value: unknown): string {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  private async syncAnimeRelations(
    account: Account,
    item: MediaItem
  ): Promise<void> {
    const malId = item.externalIds?.malId;
    if (!malId)
      throw new BadRequestException(
        "This anime title is not matched to MyAnimeList"
      );

    const details = await this.fetchAnimeFull(Number(malId));
    const localItems = await this.mediaRepo.find({
      where: { accountId: account.id },
    });
    let sortOrder = 0;

    for (const relationGroup of details.relations || []) {
      const relationType = this.normalizeRelationType(relationGroup.relation);
      for (const target of relationGroup.entry || []) {
        if (String(target.type).toLowerCase() !== "anime" || !target.mal_id)
          continue;
        const targetMalId = Number(target.mal_id);
        const localTarget = localItems.find(
          (candidate) => Number(candidate.externalIds?.malId) === targetMalId
        );
        let relation = await this.relationRepo.findOne({
          where: {
            accountId: account.id,
            sourceMediaItemId: item.id,
            relationType,
            targetMalId,
          },
        });
        relation ||= this.relationRepo.create({
          accountId: account.id,
          account,
          sourceMediaItemId: item.id,
          sourceMediaItem: item,
          relationType,
          targetMalId,
        });
        Object.assign(relation, {
          targetMediaItemId: localTarget?.id || null,
          targetMediaItem: localTarget || null,
          targetTitle: target.name || localTarget?.title || "Related anime",
          targetType: MediaType.ANIME,
          targetCoverUrl: localTarget?.coverUrl || null,
          targetYear: localTarget?.metadata?.year || null,
          sortOrder: sortOrder++,
        });
        await this.relationRepo.save(relation);
      }
    }

    item.metadata = {
      ...(item.metadata || {}),
      alternativeTitles: [
        details.title,
        details.title_english,
        details.title_japanese,
        ...(Array.isArray(details.title_synonyms)
          ? details.title_synonyms
          : []),
      ].filter(
        (title, index, titles): title is string =>
          typeof title === "string" &&
          !!title.trim() &&
          titles.indexOf(title) === index
      ),
      synopsis: details.synopsis || item.metadata?.synopsis,
      year: details.year || item.metadata?.year,
      airingStatus: details.status || item.metadata?.airingStatus,
      mediaFormat: details.type || item.metadata?.mediaFormat,
      malScore: details.score || item.metadata?.malScore,
      episodes: details.episodes ?? item.metadata?.episodes ?? null,
      studios: (details.studios || []).map((studio: any) => studio.name),
      genres: (details.genres || []).map((genre: any) => genre.name),
      releaseStartDate:
        this.providerDate(details.aired?.from) ||
        item.metadata?.releaseStartDate,
      releaseEndDate:
        this.providerDate(details.aired?.to) || item.metadata?.releaseEndDate,
    };
    item.coverUrl =
      details.images?.jpg?.large_image_url ||
      details.images?.jpg?.image_url ||
      item.coverUrl ||
      null;
    await this.syncAnimeEpisodeCatalog(account, item, details);
  }

  private async syncAnimeEpisodeCatalog(
    account: Account,
    item: MediaItem,
    details: any
  ): Promise<void> {
    const format = String(details?.type || item.metadata?.mediaFormat || "")
      .trim()
      .toLowerCase();
    const episodeCount = Number(details?.episodes ?? item.metadata?.episodes);
    if (
      format === "movie" ||
      !Number.isInteger(episodeCount) ||
      episodeCount < 1
    ) {
      return;
    }

    let season = await this.seasonRepo.findOne({
      where: { accountId: account.id, mediaItemId: item.id, number: 1 },
    });
    season ||= this.seasonRepo.create({
      accountId: account.id,
      account,
      mediaItemId: item.id,
      mediaItem: item,
      number: 1,
    });
    Object.assign(season, {
      providerSeasonId: `mal:${item.externalIds.malId}`,
      name: "Episodes",
      overview: null,
      posterUrl: item.coverUrl || null,
      airDate: this.providerDate(details?.aired?.from),
      episodeCount,
    });
    season = await this.seasonRepo.save(season);

    const backfillLegacyProgress =
      Number(item.metadata?.catalogSchemaVersion || 0) < CATALOG_SCHEMA_VERSION;
    const legacyWatched = backfillLegacyProgress
      ? Math.max(0, Number(item.metadata?.episodesWatched) || 0)
      : 0;

    for (let number = 1; number <= episodeCount; number++) {
      let episode = await this.episodeRepo.findOne({
        where: {
          accountId: account.id,
          seasonId: season.id,
          number,
        },
      });
      const watched = episode?.watched ?? number <= legacyWatched;
      const watchedAt = episode?.watchedAt ?? (watched ? new Date() : null);
      episode ||= this.episodeRepo.create({
        accountId: account.id,
        account,
        mediaItemId: item.id,
        mediaItem: item,
        seasonId: season.id,
        season,
        seasonNumber: 1,
        number,
      });
      Object.assign(episode, {
        providerEpisodeId: `mal:${item.externalIds.malId}:${number}`,
        seasonNumber: 1,
        title: episode.title || `Episode ${number}`,
        watched,
        watchedAt,
      });
      await this.episodeRepo.save(episode);
    }

    const episodes = await this.episodeRepo.find({
      where: { accountId: account.id, mediaItemId: item.id },
    });
    await this.applyTvTimeEpisodeProgress(item, episodes, details?.status);
    item.metadata = {
      ...(item.metadata || {}),
      episodes: episodeCount,
      seasons: 1,
      episodesWatched: episodes.filter(
        (episode) => episode.seasonNumber > 0 && episode.watched
      ).length,
    };
  }

  private async applyTvTimeEpisodeProgress(
    item: MediaItem,
    episodes: MediaEpisode[],
    providerStatus: unknown
  ): Promise<void> {
    if (item.metadata?.importSource !== "tvtime") return;

    const mode = String(item.metadata?.tvTimeProgressMode || "");
    const regularEpisodes = episodes
      .filter((episode) => episode.seasonNumber > 0)
      .sort(
        (left, right) =>
          left.seasonNumber - right.seasonNumber || left.number - right.number
      );
    const normalizedProviderStatus = String(providerStatus || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    const providerEnded = [
      "ended",
      "canceled",
      "cancelled",
      "finished",
      "finished airing",
    ].includes(normalizedProviderStatus);

    if (mode === "unknown-partial") {
      item.metadata = {
        ...(item.metadata || {}),
        tvTimeProgressImported: false,
        tvTimeProgressNeedsReview: true,
      };
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let reconstructable = mode === "exact" || mode === "none";
    const exactTarget =
      mode === "exact"
        ? Math.max(0, Number(item.metadata?.episodesWatched) || 0)
        : 0;

    for (let index = 0; index < regularEpisodes.length; index++) {
      const episode = regularEpisodes[index];
      let shouldBeWatched = episode.watched;
      if (mode === "exact" || mode === "none") {
        shouldBeWatched = index < exactTarget;
      } else if (mode === "all-aired") {
        const hasKnownAirDate = /^\d{4}-\d{2}-\d{2}$/.test(
          String(episode.airDate || "")
        );
        const hasAired = hasKnownAirDate
          ? String(episode.airDate) <= today
          : providerEnded;
        reconstructable ||= hasKnownAirDate || providerEnded;
        shouldBeWatched = episode.watched || hasAired;
      } else {
        continue;
      }

      if (episode.watched !== shouldBeWatched) {
        episode.watched = shouldBeWatched;
        episode.watchedAt = shouldBeWatched
          ? episode.watchedAt || new Date()
          : null;
        await this.episodeRepo.save(episode);
      }
    }

    const watchedCount = regularEpisodes.filter(
      (episode) => episode.watched
    ).length;
    if (mode === "none") {
      item.status = MediaStatus.PLANNING;
    } else if (mode === "all-aired") {
      item.status =
        providerEnded &&
        regularEpisodes.length > 0 &&
        watchedCount === regularEpisodes.length
          ? MediaStatus.COMPLETED
          : MediaStatus.WATCHING;
    } else if (
      mode === "exact" &&
      providerEnded &&
      regularEpisodes.length > 0 &&
      watchedCount === regularEpisodes.length
    ) {
      item.status = MediaStatus.COMPLETED;
    }
    item.metadata = {
      ...(item.metadata || {}),
      episodesWatched: watchedCount,
      tvTimeProgressImported: reconstructable,
      tvTimeProgressNeedsReview: !reconstructable,
    };
  }

  private async fetchAnimeFull(malId: number): Promise<any> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await axios.get(
          `https://api.jikan.moe/v4/anime/${malId}/full`,
          {
            timeout: 15000,
          }
        );
        if (!response.data?.data?.mal_id)
          throw new Error("MAL anime was not found");
        return response.data.data;
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.response?.status || 0);
        const retryable = status === 429 || status >= 500 || status === 0;
        if (!retryable || attempt === 2) break;
        const retryAfter = Number(
          error?.response?.headers?.["retry-after"] || 0
        );
        await this.pause(
          retryAfter > 0 ? retryAfter * 1000 : 500 * (attempt + 1)
        );
      }
    }
    try {
      return await this.fetchAnimeFromAniList(malId);
    } catch {
      throw lastError;
    }
  }

  private async fetchAnimeFromAniList(malId: number): Promise<any> {
    const query = `
      query AnimeByMalId($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          idMal
          title { romaji english native }
          synonyms
          description
          episodes
          format
          status
          averageScore
          startDate { year month day }
          endDate { year month day }
          coverImage { extraLarge large }
          genres
          studios(isMain: true) { nodes { name } }
          relations {
            edges {
              relationType
              node {
                idMal
                type
                title { romaji english }
                coverImage { large }
                startDate { year }
              }
            }
          }
        }
      }
    `;
    const response = await axios.post(
      "https://graphql.anilist.co",
      { query, variables: { malId } },
      { timeout: 15000 }
    );
    const media = response.data?.data?.Media;
    if (!media?.idMal) throw new Error("AniList anime was not found");

    const relations = (media.relations?.edges || [])
      .filter((edge: any) => edge?.node?.type === "ANIME" && edge.node.idMal)
      .map((edge: any) => ({
        relation: edge.relationType,
        entry: [
          {
            mal_id: Number(edge.node.idMal),
            type: "anime",
            name:
              edge.node.title?.english ||
              edge.node.title?.romaji ||
              "Related anime",
          },
        ],
      }));

    return {
      mal_id: Number(media.idMal),
      title: media.title?.english || media.title?.romaji,
      title_english: media.title?.english || null,
      title_japanese: media.title?.native || null,
      title_synonyms: Array.isArray(media.synonyms) ? media.synonyms : [],
      synopsis: this.stripProviderHtml(media.description),
      episodes: media.episodes ?? null,
      type: media.format || null,
      status: media.status || null,
      score:
        media.averageScore != null &&
        Number.isFinite(Number(media.averageScore))
          ? Number(media.averageScore) / 10
          : null,
      aired: {
        from: this.anilistDate(media.startDate),
        to: this.anilistDate(media.endDate),
      },
      images: {
        jpg: {
          large_image_url:
            media.coverImage?.extraLarge || media.coverImage?.large || null,
        },
      },
      studios: (media.studios?.nodes || []).map((studio: any) => ({
        name: studio.name,
      })),
      genres: (media.genres || []).map((name: string) => ({ name })),
      relations,
    };
  }

  private anilistDate(value: any): string | null {
    const year = Number(value?.year);
    const month = Number(value?.month);
    const day = Number(value?.day);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    )
      return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
  }

  private stripProviderHtml(value: unknown): string {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private pause(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async getAnimePreview(
    malId: number
  ): Promise<{ item: Partial<MediaItem>; relations: any[] }> {
    if (!Number.isInteger(malId) || malId <= 0) {
      throw new BadRequestException("A valid MAL anime id is required");
    }
    try {
      const response = await axios.get(
        `https://api.jikan.moe/v4/anime/${malId}/full`,
        {
          timeout: 10000,
        }
      );
      const details = response.data?.data;
      if (!details?.mal_id) throw new Error("MAL anime was not found");
      const relations = (details.relations || []).flatMap((group: any) =>
        (group.entry || [])
          .filter(
            (target: any) =>
              String(target.type).toLowerCase() === "anime" && target.mal_id
          )
          .map((target: any, index: number) => ({
            id: `mal-${target.mal_id}`,
            relationType: this.normalizeRelationType(group.relation),
            targetMalId: Number(target.mal_id),
            targetMediaItemId: null,
            targetTitle: target.name || "Related anime",
            targetType: MediaType.ANIME,
            targetCoverUrl: null,
            targetYear: null,
            sortOrder: index,
          }))
      );
      return {
        item: {
          title: details.title || "MAL anime",
          type: MediaType.ANIME,
          status: MediaStatus.PLANNING,
          rating: null,
          coverUrl:
            details.images?.jpg?.large_image_url ||
            details.images?.jpg?.image_url ||
            null,
          externalIds: { malId: Number(details.mal_id) },
          metadata: {
            synopsis: details.synopsis || "",
            releaseStartDate: this.providerDate(details.aired?.from),
            releaseEndDate: this.providerDate(details.aired?.to),
            year: details.year || null,
            mediaFormat: details.type || null,
            airingStatus: details.status || null,
            malScore: details.score ?? null,
            episodes: details.episodes ?? null,
            episodesWatched: 0,
            studios: (details.studios || []).map((studio: any) => studio.name),
            genres: (details.genres || []).map((genre: any) => genre.name),
          },
        },
        relations,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException("MAL details could not be loaded");
    }
  }

  private providerDate(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }

  private normalizeRelationType(value: unknown): MediaRelationType {
    const normalized = String(value || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const supported = new Set(Object.values(MediaRelationType));
    return supported.has(normalized as MediaRelationType)
      ? (normalized as MediaRelationType)
      : MediaRelationType.OTHER;
  }

  private buildCatalogView(
    item: MediaItem,
    seasons: MediaSeason[],
    episodes: MediaEpisode[],
    relations: MediaRelation[]
  ): MediaCatalogView {
    seasons.sort((left, right) => left.number - right.number);
    episodes.sort(
      (left, right) =>
        left.seasonNumber - right.seasonNumber || left.number - right.number
    );
    relations.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.targetTitle.localeCompare(right.targetTitle)
    );
    const regularEpisodes = episodes.filter(
      (episode) => episode.seasonNumber > 0
    );
    const watchedEpisodes = regularEpisodes.filter(
      (episode) => episode.watched
    );
    const lastWatched = watchedEpisodes[watchedEpisodes.length - 1] || null;
    const today = new Date().toISOString().slice(0, 10);
    const nextEpisode =
      regularEpisodes.find(
        (episode) =>
          !episode.watched && (!episode.airDate || episode.airDate <= today)
      ) || null;
    const upcomingEpisode =
      regularEpisodes.find(
        (episode) =>
          !episode.watched && !!episode.airDate && episode.airDate > today
      ) || null;
    const nestedSeasons = seasons.map((season) =>
      Object.assign(season, {
        episodes: episodes.filter((episode) => episode.seasonId === season.id),
      })
    );
    return {
      item,
      seasons: nestedSeasons,
      relations,
      progress: {
        watched: regularEpisodes.length
          ? watchedEpisodes.length
          : Math.max(0, Number(item.metadata?.episodesWatched) || 0),
        total: regularEpisodes.length
          ? regularEpisodes.length
          : this.positiveNumber(item.metadata?.episodes),
        seasonNumber: lastWatched?.seasonNumber ?? null,
        episodeNumber: lastWatched?.number ?? null,
      },
      nextEpisode,
      upcomingEpisode,
    };
  }

  private positiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
