import { CACHE_MANAGER } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { DailyActivityMetric } from './daily-activity-metric.entity';
import { Account } from '../system/accounts/account.entity';
import { SyncOperation } from '../sync/sync-event.entity';
import { SyncService } from '../sync/sync.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let cacheManager: { reset: jest.Mock };
  let syncService: { recordEvent: jest.Mock };

  const account = { id: 'account-1' } as Account;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((input) => ({ id: 'metric-new', ...input })),
      save: jest.fn(async (metric) => ({ id: metric.id || 'metric-saved', ...metric })),
      find: jest.fn(),
    };
    cacheManager = { reset: jest.fn() };
    syncService = { recordEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: getRepositoryToken(DailyActivityMetric), useValue: repo },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  it('upserts daily step metrics by account, date, and source', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'metric-existing',
      accountId: account.id,
      date: '2026-06-29',
      source: 'health-connect',
      steps: 1200,
    });

    const result = await service.syncDailyMetrics(account, {
      metrics: [
        {
          date: '2026-06-29',
          source: 'health-connect',
          steps: 9450,
          distanceMeters: 6200,
          activeCalories: 320,
        },
      ],
    });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: {
        accountId: account.id,
        date: '2026-06-29',
        source: 'health-connect',
      },
    });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'metric-existing',
        accountId: account.id,
        date: '2026-06-29',
        source: 'health-connect',
        steps: 9450,
        distanceMeters: 6200,
        activeCalories: 320,
      }),
    );
    expect(syncService.recordEvent).toHaveBeenCalledWith(account.id, {
      entityType: 'activity-daily-metric',
      entityId: 'metric-existing',
      operation: SyncOperation.UPSERT,
      payload: expect.objectContaining({ steps: 9450 }),
    });
    expect(cacheManager.reset).toHaveBeenCalled();
    expect(result).toEqual({
      imported: 1,
      updated: 1,
      created: 0,
      items: [expect.objectContaining({ id: 'metric-existing', steps: 9450 })],
    });
  });

  it('rejects negative step counts before writing data', async () => {
    await expect(
      service.syncDailyMetrics(account, {
        metrics: [{ date: '2026-06-29', source: 'health-connect', steps: -1 }],
      }),
    ).rejects.toThrow('steps must be a non-negative number');

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(syncService.recordEvent).not.toHaveBeenCalled();
  });
});
