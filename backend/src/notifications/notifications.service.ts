import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppNotification,
  AppNotificationCategory,
  AppNotificationPriority,
  AppNotificationSource,
  AppNotificationStatus,
} from './notification.entity';

export interface CreateAgentNotificationDto {
  title: string;
  body: string;
  category?: AppNotificationCategory;
  priority?: AppNotificationPriority;
  actionUrl?: string | null;
  scheduledFor?: string | Date | null;
  metadata?: Record<string, any> | null;
}

export interface ListPendingOptions {
  now?: Date;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AppNotification)
    private readonly repo: Repository<AppNotification>,
  ) {}

  async createAgentNotification(
    accountId: string,
    agentKeyId: string,
    dto: CreateAgentNotificationDto,
  ): Promise<AppNotification> {
    const title = this.cleanText(dto.title, 120, 'title');
    const body = this.cleanText(dto.body, 600, 'body');
    const scheduledFor = this.parseScheduledFor(dto.scheduledFor);

    const notification = this.repo.create({
      accountId,
      agentKeyId,
      source: AppNotificationSource.AGENT,
      status: AppNotificationStatus.PENDING,
      category: dto.category ?? AppNotificationCategory.ASSISTANT,
      priority: dto.priority ?? AppNotificationPriority.NORMAL,
      title,
      body,
      actionUrl: this.cleanOptionalText(dto.actionUrl, 500),
      scheduledFor,
      deliveredAt: null,
      readAt: null,
      dismissedAt: null,
      metadata: dto.metadata ?? null,
    });

    return this.repo.save(notification);
  }

  async listPending(
    accountId: string,
    options: ListPendingOptions = {},
  ): Promise<AppNotification[]> {
    const now = options.now ?? new Date();
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);

    return this.repo
      .createQueryBuilder('n')
      .where('n."accountId" = :accountId', { accountId })
      .andWhere('n.status = :status', { status: AppNotificationStatus.PENDING })
      .andWhere('(n."scheduledFor" IS NULL OR n."scheduledFor" <= :now)', { now })
      .orderBy('n."scheduledFor"', 'ASC', 'NULLS FIRST')
      .addOrderBy('n."createdAt"', 'ASC')
      .take(limit)
      .getMany();
  }

  async markDelivered(id: string, accountId: string): Promise<AppNotification> {
    const notification = await this.findOwned(id, accountId);
    if (notification.status === AppNotificationStatus.PENDING) {
      notification.status = AppNotificationStatus.DELIVERED;
    }
    notification.deliveredAt = new Date();
    return this.repo.save(notification);
  }

  async markRead(id: string, accountId: string): Promise<AppNotification> {
    const notification = await this.findOwned(id, accountId);
    notification.status = AppNotificationStatus.READ;
    notification.readAt = new Date();
    return this.repo.save(notification);
  }

  private async findOwned(id: string, accountId: string): Promise<AppNotification> {
    const notification = await this.repo.findOne({ where: { id, accountId } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  private cleanText(value: unknown, maxLength: number, field: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed.slice(0, maxLength);
  }

  private cleanOptionalText(value: unknown, maxLength: number): string | null {
    if (value == null) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : null;
  }

  private parseScheduledFor(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('scheduledFor must be a valid ISO date');
    }
    return date;
  }
}
