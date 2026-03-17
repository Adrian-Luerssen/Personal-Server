import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
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

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
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

    Object.assign(item, dto);
    const result = await this.mediaRepo.save(item);
    await this.cacheManager.reset();
    return result;
  }

  async remove(account: Account, id: string): Promise<void> {
    const item = await this.findOne(account, id);
    await this.mediaRepo.remove(item);
    await this.cacheManager.reset();
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
      // Remove reclassified flag and tags so enrichment re-processes
      const newMeta = { ...item.metadata };
      delete newMeta.reclassified;
      delete newMeta.tags;
      delete newMeta.synopsis;
      delete newMeta.malScore;
      delete newMeta.tmdbScore;
      item.metadata = newMeta;

      // Reset items that were changed from TV to anime back to TV
      // (only if they don't have a MAL ID from original import)
      if (item.type === MediaType.ANIME && !item.externalIds?.malId) {
        item.type = MediaType.TV;
      }

      // Clear cover so enrichment refetches
      item.coverUrl = null as any;
      await this.mediaRepo.save(item);
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
    let created = 0;
    let skipped = 0;

    for (const dto of items) {
      const existing = await this.mediaRepo.findOne({
        where: {
          accountId: account.id,
          title: dto.title,
          type: dto.type,
        },
      });

      if (existing) {
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
      await this.mediaRepo.save(item);
      created++;
    }

    await this.cacheManager.reset();
    return { created, skipped };
  }
}
