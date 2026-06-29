import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AppNotificationCategory,
  AppNotificationPriority,
  AppNotificationStatus,
  AppNotificationSource,
} from './notification.entity';
import { NotificationsService } from './notifications.service';

function createRepoMock<T extends { id?: string }>() {
  const items: T[] = [];
  let sequence = 0;

  return {
    items,
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (item: T) => {
      if (!item.id) item.id = `id-${++sequence}`;
      const index = items.findIndex((existing) => existing.id === item.id);
      if (index >= 0) items[index] = item;
      else items.push(item);
      return item;
    }),
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) =>
      items.find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      ) ?? null,
    ),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () =>
        items.filter((item: any) => item.status === AppNotificationStatus.PENDING),
      ),
    })),
  };
}

describe('NotificationsService', () => {
  let repo: ReturnType<typeof createRepoMock<any>>;
  let service: NotificationsService;

  beforeEach(() => {
    repo = createRepoMock();
    service = new NotificationsService(repo as any);
  });

  it('creates a validated custom notification from an agent key', async () => {
    const notification = await service.createAgentNotification(
      'account-1',
      'agent-key-1',
      {
        title: '  Workout review  ',
        body: 'Your weekly workout consistency dropped below target.',
        category: AppNotificationCategory.WORKOUT,
        priority: AppNotificationPriority.HIGH,
        actionUrl: '/workout',
        metadata: { reason: 'weekly_review' },
      },
    );

    expect(notification).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        agentKeyId: 'agent-key-1',
        source: AppNotificationSource.AGENT,
        status: AppNotificationStatus.PENDING,
        title: 'Workout review',
        body: 'Your weekly workout consistency dropped below target.',
        category: AppNotificationCategory.WORKOUT,
        priority: AppNotificationPriority.HIGH,
        actionUrl: '/workout',
        metadata: { reason: 'weekly_review' },
      }),
    );
  });

  it('rejects empty custom notification content', async () => {
    await expect(
      service.createAgentNotification('account-1', 'agent-key-1', {
        title: '   ',
        body: 'Valid body',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createAgentNotification('account-1', 'agent-key-1', {
        title: 'Valid title',
        body: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only pending notifications that are ready to deliver', async () => {
    await service.listPending('account-1', {
      now: new Date('2026-06-25T12:00:00.000Z'),
      limit: 10,
    });

    const qb = repo.createQueryBuilder.mock.results[0].value;
    expect(qb.where).toHaveBeenCalledWith('n."accountId" = :accountId', {
      accountId: 'account-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('n.status = :status', {
      status: AppNotificationStatus.PENDING,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(n."scheduledFor" IS NULL OR n."scheduledFor" <= :now)',
      { now: new Date('2026-06-25T12:00:00.000Z') },
    );
  });

  it('marks a notification delivered and read only for the owning account', async () => {
    repo.items.push({
      id: 'notification-1',
      accountId: 'account-1',
      status: AppNotificationStatus.PENDING,
    });

    const delivered = await service.markDelivered('notification-1', 'account-1');
    expect(delivered.status).toBe(AppNotificationStatus.DELIVERED);
    expect(delivered.deliveredAt).toBeInstanceOf(Date);

    const read = await service.markRead('notification-1', 'account-1');
    expect(read.status).toBe(AppNotificationStatus.READ);
    expect(read.readAt).toBeInstanceOf(Date);

    await expect(
      service.markRead('notification-1', 'other-account'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
