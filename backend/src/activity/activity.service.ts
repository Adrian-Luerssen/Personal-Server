import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Account } from '../system/accounts/account.entity';
import { SyncOperation } from '../sync/sync-event.entity';
import { SyncService } from '../sync/sync.service';
import { DailyActivityMetric } from './daily-activity-metric.entity';

interface DailyMetricInput {
  date: string;
  source?: string;
  steps: number;
  distanceMeters?: number | null;
  activeCalories?: number | null;
  sourcePackage?: string | null;
  syncedAt?: string | Date | null;
}

interface SyncDailyMetricsInput {
  metrics?: DailyMetricInput[];
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(DailyActivityMetric)
    private readonly repo: Repository<DailyActivityMetric>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional() private readonly syncService?: SyncService,
  ) {}

  async findDaily(
    account: Account,
    filters: { from?: string; to?: string; source?: string } = {},
  ) {
    const where: FindOptionsWhere<DailyActivityMetric> = {
      accountId: account.id,
    };

    if (filters.from && filters.to) {
      where.date = Between(this.normalizeDate(filters.from), this.normalizeDate(filters.to));
    } else if (filters.from || filters.to) {
      where.date = filters.from
        ? Between(this.normalizeDate(filters.from), '9999-12-31')
        : Between('0001-01-01', this.normalizeDate(filters.to as string));
    }

    if (filters.source) {
      where.source = filters.source;
    }

    return this.repo.find({
      where,
      order: { date: 'ASC' },
      take: 400,
    });
  }

  async syncDailyMetrics(account: Account, input: SyncDailyMetricsInput) {
    if (!Array.isArray(input.metrics)) {
      throw new BadRequestException('metrics must be an array');
    }

    let created = 0;
    let updated = 0;
    const items: DailyActivityMetric[] = [];

    for (const rawMetric of input.metrics) {
      const metric = this.normalizeMetric(rawMetric);
      const existing = await this.repo.findOne({
        where: {
          accountId: account.id,
          date: metric.date,
          source: metric.source,
        },
      });

      const entity = existing
        ? Object.assign(existing, metric)
        : this.repo.create({
            ...metric,
            accountId: account.id,
            account,
          });

      const saved = await this.repo.save(entity);
      if (existing) updated += 1;
      else created += 1;
      items.push(saved);
      await this.recordSync(account.id, saved);
    }

    if (items.length > 0) {
      await this.cacheManager.reset();
    }

    return {
      imported: items.length,
      updated,
      created,
      items,
    };
  }

  private normalizeMetric(input: DailyMetricInput): Partial<DailyActivityMetric> & {
    date: string;
    source: string;
    steps: number;
  } {
    const date = this.normalizeDate(input.date);
    const steps = Number(input.steps);
    if (!Number.isFinite(steps) || steps < 0) {
      throw new BadRequestException('steps must be a non-negative number');
    }

    return {
      date,
      source: (input.source || 'health-connect').trim() || 'health-connect',
      steps: Math.round(steps),
      distanceMeters: this.optionalInteger(input.distanceMeters),
      activeCalories: this.optionalInteger(input.activeCalories),
      sourcePackage: input.sourcePackage || null,
      syncedAt: input.syncedAt ? new Date(input.syncedAt) : new Date(),
    };
  }

  private normalizeDate(value: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
      throw new BadRequestException('date must be an ISO date string');
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('date must be valid');
    }
    return value.slice(0, 10);
  }

  private optionalInteger(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed);
  }

  private async recordSync(accountId: string, metric: DailyActivityMetric) {
    if (!this.syncService) return;
    await this.syncService.recordEvent(accountId, {
      entityType: 'activity-daily-metric',
      entityId: metric.id,
      operation: SyncOperation.UPSERT,
      payload: metric,
    });
  }
}
