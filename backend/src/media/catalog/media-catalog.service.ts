import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Repository } from "typeorm";
import { Account } from "../../system/accounts/account.entity";
import { MediaEpisode } from "../entities/media-episode.entity";
import { MediaItem, MediaStatus, MediaType } from "../entities/media-item.entity";
import {
  MediaRelation,
  MediaRelationType,
} from "../entities/media-relation.entity";
import { MediaSeason } from "../entities/media-season.entity";

const TMDB_IMAGE_ROOT = "https://image.tmdb.org/t/p/w500";

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

@Injectable()
export class MediaCatalogService {
  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    @InjectRepository(MediaSeason)
    private readonly seasonRepo: Repository<MediaSeason>,
    @InjectRepository(MediaEpisode)
    private readonly episodeRepo: Repository<MediaEpisode>,
    @InjectRepository(MediaRelation)
    private readonly relationRepo: Repository<MediaRelation>,
  ) {}

  async syncItem(account: Account, item: MediaItem): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException("The media item does not belong to this account");
    }

    try {
      if (item.type === MediaType.TV) {
        await this.syncTmdbSeries(account, item);
      } else if (item.type === MediaType.ANIME) {
        await this.syncAnimeRelations(account, item);
      } else {
        throw new BadRequestException("Structured catalog sync supports TV and anime titles");
      }

      item.metadata = {
        ...(item.metadata || {}),
        catalogSyncState: "ready",
        catalogSyncedAt: new Date().toISOString(),
        catalogSyncError: null,
      };
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
        "Catalog synchronization failed. Existing progress is still available.",
      );
    }
  }

  async getCatalog(account: Account, item: MediaItem): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException("The media item does not belong to this account");
    }

    const [seasons, episodes, relations] = await Promise.all([
      this.seasonRepo.find({ where: { accountId: account.id, mediaItemId: item.id } }),
      this.episodeRepo.find({ where: { accountId: account.id, mediaItemId: item.id } }),
      this.relationRepo.find({ where: { accountId: account.id, sourceMediaItemId: item.id } }),
    ]);

    return this.buildCatalogView(item, seasons, episodes, relations);
  }

  async getCatalogSummaries(
    account: Account,
    items: MediaItem[],
  ): Promise<Record<string, MediaCatalogView>> {
    if (!items.length) return {};
    const [allSeasons, allEpisodes, allRelations] = await Promise.all([
      this.seasonRepo.find({ where: { accountId: account.id } }),
      this.episodeRepo.find({ where: { accountId: account.id } }),
      this.relationRepo.find({ where: { accountId: account.id } }),
    ]);
    return Object.fromEntries(items.map((item) => {
      const catalog = this.buildCatalogView(
        item,
        allSeasons.filter((season) => season.mediaItemId === item.id),
        allEpisodes.filter((episode) => episode.mediaItemId === item.id),
        allRelations.filter((relation) => relation.sourceMediaItemId === item.id),
      );
      return [item.id, { ...catalog, seasons: [], relations: [] }];
    }));
  }

  async setEpisodeWatched(
    account: Account,
    item: MediaItem,
    episodeId: string,
    watched: boolean,
  ): Promise<MediaCatalogView> {
    if (item.accountId !== account.id) {
      throw new BadRequestException("The media item does not belong to this account");
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

    const episodes = await this.episodeRepo.find({
      where: { accountId: account.id, mediaItemId: item.id },
    });
    const regularEpisodes = episodes.filter((entry) => entry.seasonNumber > 0);
    const watchedCount = regularEpisodes.filter((entry) => entry.watched).length;
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
      const allWatched = regularEpisodes.length > 0 && watchedCount === regularEpisodes.length;
      item.status = allWatched ? MediaStatus.COMPLETED : MediaStatus.WATCHING;
      item.metadata.trackingStatusSource = "episode-progress";
      if (allWatched && !item.endDate) {
        item.endDate = today;
        item.metadata.endDateSource = "episode-progress";
      } else if (!allWatched && item.metadata.endDateSource === "episode-progress") {
        item.endDate = null;
        delete item.metadata.endDateSource;
      }
    }
    await this.mediaRepo.save(item);
    return this.getCatalog(account, item);
  }

  private async syncTmdbSeries(account: Account, item: MediaItem): Promise<void> {
    const tmdbKey = process.env.TMDB_API_KEY;
    const tmdbId = item.externalIds?.tmdbId;
    if (!tmdbKey) throw new ServiceUnavailableException("TMDB is not configured");
    if (!tmdbId) throw new BadRequestException("This TV title is not matched to TMDB");

    const response = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
      params: { api_key: tmdbKey },
      timeout: 10000,
    });
    const details = response.data || {};
    const providerSeasons = Array.isArray(details.seasons) ? details.seasons : [];
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
        providerSeasonId: providerSeason.id != null ? String(providerSeason.id) : undefined,
        name: providerSeason.name || (number === 0 ? "Specials" : `Season ${number}`),
        overview: providerSeason.overview || null,
        posterUrl: providerSeason.poster_path ? `${TMDB_IMAGE_ROOT}${providerSeason.poster_path}` : null,
        airDate: providerSeason.air_date || null,
        episodeCount: providerSeason.episode_count ?? null,
      });
      season = await this.seasonRepo.save(season);

      const seasonResponse = await axios.get(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${number}`,
        { params: { api_key: tmdbKey }, timeout: 10000 },
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
          providerEpisodeId: providerEpisode.id != null ? String(providerEpisode.id) : undefined,
          seasonNumber: number,
          title: providerEpisode.name || `Episode ${episodeNumber}`,
          overview: providerEpisode.overview || null,
          airDate: providerEpisode.air_date || null,
          runtime: providerEpisode.runtime ?? null,
          imageUrl: providerEpisode.still_path ? `${TMDB_IMAGE_ROOT}${providerEpisode.still_path}` : null,
          watched: existingWatched,
          watchedAt: existingWatchedAt,
        });
        await this.episodeRepo.save(episode);
      }
    }

    if (firstStructuredSync) {
      const legacyCount = Math.max(0, Number(item.metadata?.episodesWatched) || 0);
      const episodes = await this.episodeRepo.find({
        where: { accountId: account.id, mediaItemId: item.id },
      });
      const regularEpisodes = episodes
        .filter((episode) => episode.seasonNumber > 0)
        .sort((left, right) =>
          left.seasonNumber - right.seasonNumber || left.number - right.number,
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
    const regularEpisodes = allEpisodes.filter((episode) => episode.seasonNumber > 0);
    const regularSeasonCount = providerSeasons.filter((season) => Number(season.season_number) > 0).length;
    item.metadata = {
      ...(item.metadata || {}),
      synopsis: details.overview || item.metadata?.synopsis,
      airingStatus: details.status || item.metadata?.airingStatus,
      seasons: regularSeasonCount,
      episodes: regularEpisodes.length,
      episodesWatched: regularEpisodes.filter((episode) => episode.watched).length,
    };
  }

  private async syncAnimeRelations(account: Account, item: MediaItem): Promise<void> {
    const malId = item.externalIds?.malId;
    if (!malId) throw new BadRequestException("This anime title is not matched to MyAnimeList");

    const response = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/full`, {
      timeout: 10000,
    });
    const details = response.data?.data || {};
    const localItems = await this.mediaRepo.find({ where: { accountId: account.id } });
    let sortOrder = 0;

    for (const relationGroup of details.relations || []) {
      const relationType = this.normalizeRelationType(relationGroup.relation);
      for (const target of relationGroup.entry || []) {
        if (String(target.type).toLowerCase() !== "anime" || !target.mal_id) continue;
        const targetMalId = Number(target.mal_id);
        const localTarget = localItems.find((candidate) =>
          Number(candidate.externalIds?.malId) === targetMalId,
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
      synopsis: details.synopsis || item.metadata?.synopsis,
      year: details.year || item.metadata?.year,
      airingStatus: details.status || item.metadata?.airingStatus,
      mediaFormat: details.type || item.metadata?.mediaFormat,
      malScore: details.score || item.metadata?.malScore,
      studios: (details.studios || []).map((studio: any) => studio.name),
      genres: (details.genres || []).map((genre: any) => genre.name),
      releaseStartDate: this.providerDate(details.aired?.from) || item.metadata?.releaseStartDate,
      releaseEndDate: this.providerDate(details.aired?.to) || item.metadata?.releaseEndDate,
    };
  }

  async getAnimePreview(malId: number): Promise<{ item: Partial<MediaItem>; relations: any[] }> {
    if (!Number.isInteger(malId) || malId <= 0) {
      throw new BadRequestException("A valid MAL anime id is required");
    }
    try {
      const response = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/full`, {
        timeout: 10000,
      });
      const details = response.data?.data;
      if (!details?.mal_id) throw new Error("MAL anime was not found");
      const relations = (details.relations || []).flatMap((group: any) =>
        (group.entry || [])
          .filter((target: any) => String(target.type).toLowerCase() === "anime" && target.mal_id)
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
          })),
      );
      return {
        item: {
          title: details.title || "MAL anime",
          type: MediaType.ANIME,
          status: MediaStatus.PLANNING,
          rating: null,
          coverUrl: details.images?.jpg?.large_image_url || details.images?.jpg?.image_url || null,
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
    const normalized = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
    const supported = new Set(Object.values(MediaRelationType));
    return supported.has(normalized as MediaRelationType)
      ? normalized as MediaRelationType
      : MediaRelationType.OTHER;
  }

  private buildCatalogView(
    item: MediaItem,
    seasons: MediaSeason[],
    episodes: MediaEpisode[],
    relations: MediaRelation[],
  ): MediaCatalogView {
    seasons.sort((left, right) => left.number - right.number);
    episodes.sort((left, right) =>
      left.seasonNumber - right.seasonNumber || left.number - right.number,
    );
    relations.sort((left, right) =>
      left.sortOrder - right.sortOrder || left.targetTitle.localeCompare(right.targetTitle),
    );
    const regularEpisodes = episodes.filter((episode) => episode.seasonNumber > 0);
    const watchedEpisodes = regularEpisodes.filter((episode) => episode.watched);
    const lastWatched = watchedEpisodes[watchedEpisodes.length - 1] || null;
    const today = new Date().toISOString().slice(0, 10);
    const nextEpisode = regularEpisodes.find((episode) =>
      !episode.watched && (!episode.airDate || episode.airDate <= today),
    ) || null;
    const upcomingEpisode = regularEpisodes.find((episode) =>
      !episode.watched && !!episode.airDate && episode.airDate > today,
    ) || null;
    const nestedSeasons = seasons.map((season) => Object.assign(season, {
      episodes: episodes.filter((episode) => episode.seasonId === season.id),
    }));
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
