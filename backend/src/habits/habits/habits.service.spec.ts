import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HabitsService } from './habits.service';
import { Habit } from '../entities/habit.entity';
import { HabitEntry } from '../entities/habit-entry.entity';

describe('HabitsService', () => {
  let service: HabitsService;
  let mockQueryBuilder: any;
  let mockEntryRepo: any;
  let mockHabitRepo: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockEntryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
    };

    mockHabitRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockCacheManager = {
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitsService,
        { provide: getRepositoryToken(Habit), useValue: mockHabitRepo },
        { provide: getRepositoryToken(HabitEntry), useValue: mockEntryRepo },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<HabitsService>(HabitsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getHeatmap', () => {
    const mockAccount = { id: 'acc-123' } as any;

    it('should build the query with correct parameters for a 365-day window', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getHeatmap(mockAccount);

      expect(mockEntryRepo.createQueryBuilder).toHaveBeenCalledWith('e');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('e.date', 'date');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        "SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END)",
        'count',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'total');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'e.accountId = :accountId',
        { accountId: 'acc-123' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'e.date >= :from',
        expect.objectContaining({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('e.date');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('e.date', 'ASC');
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should use a date approximately 365 days ago as the lower bound', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getHeatmap(mockAccount);

      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls;
      const fromCall = andWhereCalls.find(
        (call: any[]) => call[0] === 'e.date >= :from',
      );
      expect(fromCall).toBeDefined();

      const fromDate = new Date(fromCall[1].from);
      const now = new Date();
      const diffMs = now.getTime() - fromDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      // Should be approximately 365 days (allow for leap years and test timing)
      expect(diffDays).toBeGreaterThanOrEqual(364);
      expect(diffDays).toBeLessThanOrEqual(367);
    });

    it('should return an empty array when there are no entries', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getHeatmap(mockAccount);

      expect(result).toEqual([]);
    });

    it('should map raw database rows to typed objects with parsed integers', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-06-01', count: '3', total: '5' },
        { date: '2025-06-02', count: '1', total: '2' },
        { date: '2025-06-03', count: '0', total: '4' },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(result).toEqual([
        { date: '2025-06-01', count: 3, total: 5 },
        { date: '2025-06-02', count: 1, total: 2 },
        { date: '2025-06-03', count: 0, total: 4 },
      ]);
    });

    it('should parse string counts from the database into numbers', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-07-15', count: '10', total: '20' },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(typeof result[0].count).toBe('number');
      expect(typeof result[0].total).toBe('number');
      expect(result[0].count).toBe(10);
      expect(result[0].total).toBe(20);
    });

    it('should default count to 0 when parseInt returns NaN', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-08-01', count: null, total: '3' },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(result[0].count).toBe(0);
      expect(result[0].total).toBe(3);
    });

    it('should default total to 0 when parseInt returns NaN', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-08-01', count: '2', total: null },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(result[0].count).toBe(2);
      expect(result[0].total).toBe(0);
    });

    it('should preserve the date ordering from the database', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-03-01', count: '1', total: '1' },
        { date: '2025-03-15', count: '2', total: '3' },
        { date: '2025-04-01', count: '5', total: '7' },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(result.map((r) => r.date)).toEqual([
        '2025-03-01',
        '2025-03-15',
        '2025-04-01',
      ]);
    });

    it('should handle a single-day result', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2025-12-25', count: '1', total: '1' },
      ]);

      const result = await service.getHeatmap(mockAccount);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ date: '2025-12-25', count: 1, total: 1 });
    });

    it('should scope the query to the provided account only', async () => {
      const otherAccount = { id: 'acc-other' } as any;
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getHeatmap(otherAccount);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'e.accountId = :accountId',
        { accountId: 'acc-other' },
      );
    });
  });
});
