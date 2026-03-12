// Mock @nestjsx/crud-typeorm to avoid filesystem read errors on Windows/OneDrive
jest.mock('@nestjsx/crud-typeorm', () => ({
  TypeOrmCrudService: class {
    constructor(public repo: any) {}
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkoutSessionsService } from './sessions.service';
import { WorkoutSession } from './session.entity';
import { WorkoutSet } from '../sets/set.entity';
import { Account } from '../../system/accounts/account.entity';

describe('WorkoutSessionsService – PR methods', () => {
  let service: WorkoutSessionsService;
  let mockSetRepo: any;
  let mockSessionRepo: any;

  const account = { id: 'acct-1' } as Account;

  /** Helper: builds a chainable query-builder mock that resolves to `result` */
  function makeQB(result: any, isList = false) {
    const qb: any = {};
    const chainMethods = [
      'innerJoin',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'limit',
    ];
    for (const m of chainMethods) {
      qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.getRawOne = jest.fn().mockResolvedValue(result);
    qb.getRawMany = jest.fn().mockResolvedValue(isList ? result : [result]);
    return qb;
  }

  beforeEach(async () => {
    mockSetRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    mockSessionRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      target: WorkoutSession,
      metadata: {
        columns: [],
        relations: [],
        connection: { options: { type: 'postgres' } },
      },
      manager: {
        getRepository: jest.fn().mockReturnValue(mockSetRepo),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutSessionsService,
        {
          provide: getRepositoryToken(WorkoutSession),
          useValue: mockSessionRepo,
        },
      ],
    }).compile();

    service = module.get<WorkoutSessionsService>(WorkoutSessionsService);
  });

  afterEach(() => jest.resetAllMocks());

  // ---------------------------------------------------------------------------
  // getPersonalRecords
  // ---------------------------------------------------------------------------
  describe('getPersonalRecords', () => {
    it('should return PRs sorted by max weight descending', async () => {
      // First query: aggregate max weight per exercise
      const aggregateQB = makeQB(
        [
          { exerciseId: 'ex-1', exerciseName: 'Bench Press', maxWeight: '100' },
          { exerciseId: 'ex-2', exerciseName: 'Squat', maxWeight: '80' },
        ],
        true,
      );
      // Second & third queries: detail lookups for each PR set
      const detailQB1 = makeQB({ st_reps: 5, s_date: '2026-01-10' });
      const detailQB2 = makeQB({ st_reps: 8, s_date: '2026-02-15' });

      mockSetRepo.createQueryBuilder
        .mockReturnValueOnce(aggregateQB)
        .mockReturnValueOnce(detailQB1)
        .mockReturnValueOnce(detailQB2);

      const result = await service.getPersonalRecords(account);

      expect(result).toEqual([
        {
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          maxWeight: 100,
          reps: 5,
          date: '2026-01-10',
        },
        {
          exerciseId: 'ex-2',
          exerciseName: 'Squat',
          maxWeight: 80,
          reps: 8,
          date: '2026-02-15',
        },
      ]);

      // Verify the aggregate query filtered by account and positive weight
      const aggWhereCalls = aggregateQB.where.mock.calls;
      expect(aggWhereCalls[0][1]).toEqual({ aid: 'acct-1' });
      const andWhereCalls = aggregateQB.andWhere.mock.calls;
      expect(andWhereCalls.some((c: any[]) => c[0].includes('weight IS NOT NULL'))).toBe(true);
      expect(andWhereCalls.some((c: any[]) => c[0].includes('weight > 0'))).toBe(true);

      // Verify ordering is by max weight descending
      expect(aggregateQB.orderBy).toHaveBeenCalledWith('MAX(st.weight)', 'DESC');
    });

    it('should return an empty array when user has no sets', async () => {
      const emptyQB = makeQB([], true);
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(emptyQB);

      const result = await service.getPersonalRecords(account);

      expect(result).toEqual([]);
    });

    it('should handle null reps/date in the detail lookup gracefully', async () => {
      const aggregateQB = makeQB(
        [{ exerciseId: 'ex-3', exerciseName: 'Deadlift', maxWeight: '200' }],
        true,
      );
      // Detail lookup returns null (no matching set found — edge case)
      const detailQB = makeQB(null);
      mockSetRepo.createQueryBuilder
        .mockReturnValueOnce(aggregateQB)
        .mockReturnValueOnce(detailQB);

      const result = await service.getPersonalRecords(account);

      expect(result).toEqual([
        {
          exerciseId: 'ex-3',
          exerciseName: 'Deadlift',
          maxWeight: 200,
          reps: null,
          date: null,
        },
      ]);
    });

    it('should parse maxWeight as a float, not leave it as a string', async () => {
      const aggregateQB = makeQB(
        [{ exerciseId: 'ex-4', exerciseName: 'OHP', maxWeight: '62.5' }],
        true,
      );
      const detailQB = makeQB({ st_reps: 6, s_date: '2026-03-01' });
      mockSetRepo.createQueryBuilder
        .mockReturnValueOnce(aggregateQB)
        .mockReturnValueOnce(detailQB);

      const result = await service.getPersonalRecords(account);

      expect(result[0].maxWeight).toBe(62.5);
      expect(typeof result[0].maxWeight).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // checkSessionPRs
  // ---------------------------------------------------------------------------
  describe('checkSessionPRs', () => {
    const sessionId = 'sess-1';

    it('should identify a new PR when set weight exceeds previous max', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-1',
          weight: 110,
          reps: 3,
          exercise: { name: 'Bench Press' },
          sessionId,
          accountId: account.id,
        },
      ]);

      // Previous max for ex-1 was 100
      const prevMaxQB = makeQB({ maxWeight: '100' });
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(prevMaxQB);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toEqual([
        {
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          previousMax: 100,
          newMax: 110,
          reps: 3,
          improvement: 10,
        },
      ]);
    });

    it('should report improvement as null when there is no previous record', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-5',
          weight: 40,
          reps: 12,
          exercise: { name: 'Lateral Raise' },
          sessionId,
          accountId: account.id,
        },
      ]);

      // No previous record → maxWeight is null
      const prevMaxQB = makeQB({ maxWeight: null });
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(prevMaxQB);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toHaveLength(1);
      expect(result[0].previousMax).toBe(0);
      expect(result[0].improvement).toBeNull();
    });

    it('should skip sets with no exerciseId, null weight, or weight <= 0', async () => {
      mockSetRepo.find.mockResolvedValue([
        { exerciseId: null, weight: 50, reps: 10, exercise: null },
        { exerciseId: 'ex-1', weight: null, reps: 10, exercise: { name: 'Bench' } },
        { exerciseId: 'ex-2', weight: 0, reps: 10, exercise: { name: 'Squat' } },
        { exerciseId: 'ex-3', weight: -5, reps: 10, exercise: { name: 'Curl' } },
      ]);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toEqual([]);
      // No query builder calls should have been made since all sets were skipped
      expect(mockSetRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return empty array when session has no sets', async () => {
      mockSetRepo.find.mockResolvedValue([]);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toEqual([]);
    });

    it('should NOT flag a set as PR when weight equals the previous max', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-1',
          weight: 100,
          reps: 5,
          exercise: { name: 'Bench Press' },
          sessionId,
          accountId: account.id,
        },
      ]);

      // Previous max is also 100 — this is NOT a new PR
      const prevMaxQB = makeQB({ maxWeight: '100' });
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(prevMaxQB);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toEqual([]);
    });

    it('should check multiple exercises and only report those that are PRs', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-1',
          weight: 110,
          reps: 3,
          exercise: { name: 'Bench Press' },
          sessionId,
          accountId: account.id,
        },
        {
          exerciseId: 'ex-2',
          weight: 80,
          reps: 5,
          exercise: { name: 'Squat' },
          sessionId,
          accountId: account.id,
        },
      ]);

      // ex-1: previous max 100 → 110 is a new PR
      const qb1 = makeQB({ maxWeight: '100' });
      // ex-2: previous max 90 → 80 is NOT a new PR
      const qb2 = makeQB({ maxWeight: '90' });
      mockSetRepo.createQueryBuilder
        .mockReturnValueOnce(qb1)
        .mockReturnValueOnce(qb2);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result).toHaveLength(1);
      expect(result[0].exerciseId).toBe('ex-1');
      expect(result[0].newMax).toBe(110);
    });

    it('should use "Unknown" when exercise relation is missing', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-orphan',
          weight: 50,
          reps: 10,
          exercise: null,
          sessionId,
          accountId: account.id,
        },
      ]);

      const prevMaxQB = makeQB({ maxWeight: null });
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(prevMaxQB);

      const result = await service.checkSessionPRs(account, sessionId);

      expect(result[0].exerciseName).toBe('Unknown');
    });

    it('should exclude current session when computing previous max', async () => {
      mockSetRepo.find.mockResolvedValue([
        {
          exerciseId: 'ex-1',
          weight: 120,
          reps: 1,
          exercise: { name: 'Bench Press' },
          sessionId,
          accountId: account.id,
        },
      ]);

      const prevMaxQB = makeQB({ maxWeight: '100' });
      mockSetRepo.createQueryBuilder.mockReturnValueOnce(prevMaxQB);

      await service.checkSessionPRs(account, sessionId);

      // Verify the query excluded the current session
      const andWhereCalls = prevMaxQB.andWhere.mock.calls;
      const sessionExclusionCall = andWhereCalls.find(
        (c: any[]) => c[0].includes('sessionId') && c[0].includes('!='),
      );
      expect(sessionExclusionCall).toBeDefined();
      expect(sessionExclusionCall[1]).toEqual({ sid: sessionId });
    });
  });
});
