import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  MediaItem,
  MediaType,
  MediaStatus,
} from "../entities/media-item.entity";
import { Account } from "../../system/accounts/account.entity";
import { Cache } from "cache-manager";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";
import { randomUUID } from "crypto";

export interface MediaStats {
  total: number;
  byType: Record<string, number>;
  byTag: Record<string, number>;
  byStatus: Record<string, number>;
  averageRating: number | null;
  rated: number;
  completed: number;
  ratingsDistribution: Record<string, number>;
}

const MEDIA_BULK_INSERT_CHUNK_SIZE = 500;

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional()
    private readonly syncService?: SyncService
  ) {}

  // ========== CRUD ==========

  async findAll(
    account: Account,
    filters?: { type?: MediaType; status?: MediaStatus; search?: string; tag?: string }
  ): Promise<MediaItem[]> {
    let query = this.mediaRepo
      .createQueryBuilder("m")
      .where("m.accountId = :accountId", { accountId: account.id });

    if (filters?.tag) {
      // Filter by tag in metadata.tags JSONB array
      query = query.andWhere("m.metadata->'tags' @> :tag", {
        tag: JSON.stringify([filters.tag]),
      });
    } else if (filters?.type) {
      query = query.andWhere("m.type = :type", { type: filters.type });
    }
    if (filters?.status) {
      query = query.andWhere("m.status = :status", { status: filters.status });
    }
    if (filters?.search) {
      query = query.andWhere("m.title ILIKE :search", {
        search: `%${filters.search}%`,
      });
    }

    return query.orderBy("m.updatedAt", "DESC").getMany();
  }

  async findOne(account: Account, id: string): Promise<MediaItem> {
    const item = await this.mediaRepo.findOne({
      where: { accountId: account.id, id },
    });
    if (!item) throw new NotFoundException(`Media item ${id} not found`);
    return item;
  }

  async create(
    account: Account,
    dto: {
      title: string;
      type: MediaType;
      status?: MediaStatus;
      rating?: number;
      startDate?: string;
      endDate?: string;
      notes?: string;
      coverUrl?: string;
      metadata?: Record<string, any>;
      externalIds?: Record<string, any>;
    }
  ): Promise<MediaItem> {
    const item = this.mediaRepo.create({
      ...dto,
      accountId: account.id,
      account,
      status: dto.status ?? MediaStatus.PLANNING,
      metadata: dto.metadata ?? {},
      externalIds: dto.externalIds ?? {},
    });
    const result = await this.mediaRepo.save(item);
    await this.cacheManager.reset();
    await this.recordSync(account.id, result, SyncOperation.UPSERT);
    return result;
  }

  async update(
    account: Account,
    id: string,
    dto: Partial<{
      title: string;
      type: MediaType;
      status: MediaStatus;
      rating: number;
      startDate: string;
      endDate: string;
      notes: string;
      coverUrl: string;
      metadata: Record<string, any>;
      externalIds: Record<string, any>;
    }>
  ): Promise<MediaItem> {
    const item = await this.findOne(account, id);

    // Merge metadata/externalIds instead of replacing
    if (dto.metadata) {
      dto.metadata = { ...item.metadata, ...dto.metadata };
    }
    if (dto.externalIds) {
      dto.externalIds = { ...item.externalIds, ...dto.externalIds };
    }

    if (dto.metadata && Object.prototype.hasOwnProperty.call(dto.metadata, "episodesWatched") && dto.status === undefined) {
      const watched = Math.max(0, Number(dto.metadata.episodesWatched) || 0);
      const total = Math.max(0, Number(dto.metadata.episodes) || 0);
      const statusCanFollowProgress =
        item.status === MediaStatus.PLANNING ||
        item.status === MediaStatus.WATCHING ||
        dto.metadata.trackingStatusSource === "episode-progress";
      if (statusCanFollowProgress) {
        const today = new Date().toISOString().slice(0, 10);
        if (watched > 0 && !item.startDate && dto.startDate === undefined) {
          item.startDate = today;
          dto.metadata.startDateSource = "episode-progress";
        }
        const completed = total > 0 && watched >= total;
        item.status = completed ? MediaStatus.COMPLETED : MediaStatus.WATCHING;
        dto.metadata.trackingStatusSource = "episode-progress";
        if (completed && !item.endDate && dto.endDate === undefined) {
          item.endDate = today;
          dto.metadata.endDateSource = "episode-progress";
        } else if (!completed && dto.metadata.endDateSource === "episode-progress" && dto.endDate === undefined) {
          item.endDate = null;
          delete dto.metadata.endDateSource;
        }
      }
    }

    Object.assign(item, dto);
    const result = await this.mediaRepo.save(item);
    await this.cacheManager.reset();
    await this.recordSync(account.id, result, SyncOperation.UPSERT);
    return result;
  }

  async remove(account: Account, id: string): Promise<void> {
    const item = await this.findOne(account, id);
    await this.mediaRepo.remove(item);
    await this.cacheManager.reset();
    await this.recordSync(account.id, item, SyncOperation.DELETE);
  }

  // ========== STATS ==========

  async getStats(account: Account, type?: MediaType): Promise<MediaStats> {
    let query = this.mediaRepo
      .createQueryBuilder("m")
      .where("m.accountId = :accountId", { accountId: account.id });

    if (type) {
      query = query.andWhere("m.type = :type", { type });
    }

    const items = await query.getMany();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const ratingsDistribution: Record<string, number> = {};
    let ratingSum = 0;
    let rated = 0;
    let completed = 0;

    const byTag: Record<string, number> = {};

    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;

      // Count by tags
      const tags: string[] = Array.isArray(item.metadata?.tags) ? item.metadata.tags : [item.type];
      for (const tag of tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }

      if (item.status === MediaStatus.COMPLETED) completed++;

      if (item.rating != null) {
        const r = Number(item.rating);
        ratingSum += r;
        rated++;
        const bucket = String(Math.floor(r));
        ratingsDistribution[bucket] = (ratingsDistribution[bucket] || 0) + 1;
      }
    }

    return {
      total: items.length,
      byType,
      byTag,
      byStatus,
      averageRating: rated > 0 ? Math.round((ratingSum / rated) * 10) / 10 : null,
      rated,
      completed,
      ratingsDistribution,
    };
  }

  // ========== RESET CLASSIFICATION ==========

  async resetClassification(account: Account): Promise<{ reset: number }> {
    // Find all items that were reclassified by enrichment (not from original import source)
    const items = await this.mediaRepo
      .createQueryBuilder("m")
      .where("m.accountId = :accountId", { accountId: account.id })
      .andWhere("(m.metadata->>'reclassified') = 'true'")
      .getMany();

    let reset = 0;
    for (const item of items) {
      // Remove enrichment-derived fields while preserving source import facts.
      const newMeta = { ...item.metadata };
      delete newMeta.reclassified;

      // A manual provider match is the user's canonical classification choice.
      // Keep it intact even when the original import came from another source.
      if (newMeta.manualMatch) {
        if (item.type === MediaType.TV && item.externalIds?.malId) item.type = MediaType.ANIME;
        newMeta.tags = this.tagsForSourceType(item.type);
        item.metadata = newMeta;
        await this.mediaRepo.save(item);
        reset++;
        continue;
      }

      delete newMeta.synopsis;
      delete newMeta.malScore;
      delete newMeta.tmdbScore;
      delete newMeta.enrichmentStatus;
      delete newMeta.enrichmentError;

      let sourceType = this.mediaTypeFromSource(newMeta.sourceType);
      const legacyTvTime = !sourceType && this.looksLikeLegacyTvTime(item, newMeta);
      if (legacyTvTime) {
        sourceType = MediaType.TV;
        newMeta.importSource = "tvtime";
        newMeta.sourceType = "tv";
      }
      if (sourceType) {
        item.type = sourceType;
        newMeta.tags = this.tagsForSourceType(sourceType);
      } else {
        delete newMeta.tags;
      }
      item.metadata = newMeta;

      if (
        (newMeta.importSource === "tvtime" || legacyTvTime) &&
        sourceType === MediaType.TV &&
        item.externalIds?.malId &&
        !newMeta.manualMatch
      ) {
        const { malId, ...remainingExternalIds } = item.externalIds;
        item.externalIds = remainingExternalIds;
      }

      if (newMeta.importCoverUrl) {
        item.coverUrl = newMeta.importCoverUrl;
      } else {
        item.coverUrl = null as any;
      }
      await this.mediaRepo.save(item);
      await this.recordSync(account.id, item, SyncOperation.UPSERT);
      reset++;
    }

    await this.cacheManager.reset();
    return { reset };
  }

  // ========== BULK CREATE (for imports) ==========

  async bulkCreate(
    account: Account,
    items: Array<{
      title: string;
      type: MediaType;
      status?: MediaStatus;
      rating?: number;
      startDate?: string;
      endDate?: string;
      notes?: string;
      coverUrl?: string;
      metadata?: Record<string, any>;
      externalIds?: Record<string, any>;
    }>
  ): Promise<{ created: number; skipped: number }> {
    let skipped = 0;
    const existing = await this.mediaRepo.find({
      where: { accountId: account.id },
      select: ["title", "type"],
    });
    const seenKeys = new Set(
      existing.map((item) => this.mediaIdentityKey(item.title, item.type))
    );
    const toInsert: MediaItem[] = [];

    for (const dto of items) {
      const key = this.mediaIdentityKey(dto.title, dto.type);
      if (seenKeys.has(key)) {
        skipped++;
        continue;
      }

      const item = this.mediaRepo.create({
        ...dto,
        accountId: account.id,
        account,
        status: dto.status ?? MediaStatus.PLANNING,
        metadata: dto.metadata ?? {},
        externalIds: dto.externalIds ?? {},
      });
      toInsert.push(item);
      seenKeys.add(key);
    }

    for (let i = 0; i < toInsert.length; i += MEDIA_BULK_INSERT_CHUNK_SIZE) {
      await this.mediaRepo.insert(
        toInsert.slice(i, i + MEDIA_BULK_INSERT_CHUNK_SIZE)
      );
    }
    await this.cacheManager.reset();
    await this.recordBulkImportSync(account.id, toInsert.length, skipped);
    return { created: toInsert.length, skipped };
  }

  private mediaIdentityKey(title: string, type: MediaType): string {
    return `${title.trim().toLowerCase()}::${type}`;
  }

  private async recordSync(
    accountId: string,
    item: MediaItem,
    operation: SyncOperation
  ) {
    if (!this.syncService) return;
    await this.syncService.recordEvent(accountId, {
      entityType: "media-item",
      entityId: item.id,
      operation,
      payload: operation === SyncOperation.DELETE ? null : item,
    });
  }

  private async recordBulkImportSync(
    accountId: string,
    created: number,
    skipped: number
  ) {
    if (!this.syncService || created === 0) return;
    await this.syncService.recordEvent(accountId, {
      entityType: "media-item",
      entityId: randomUUID(),
      operation: SyncOperation.UPSERT,
      payload: {
        source: "media-import",
        created,
        skipped,
      },
    });
  }

  private mediaTypeFromSource(sourceType: any): MediaType | null {
    if (Object.values(MediaType).includes(sourceType)) {
      return sourceType as MediaType;
    }
    return null;
  }

  private tagsForSourceType(type: MediaType): string[] {
    return [type];
  }

  private looksLikeLegacyTvTime(
    item: MediaItem,
    metadata: Record<string, any>
  ): boolean {
    return (
      item.type === MediaType.ANIME &&
      !metadata.importSource &&
      metadata.episodesWatched != null &&
      (metadata.runtime != null || metadata.archived != null)
    );
  }
}
