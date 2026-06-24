import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { Stream, StreamPlatform } from '../music/streams/stream.entity';
import { Track } from '../music/tracks/track.entity';
import { WorkoutSession } from '../workout/sessions/session.entity';
import { Account } from '../system/accounts/account.entity';
import { SyncService } from '../sync/sync.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockDataSource: { query: jest.Mock };
  let mockStreamRepo: { createQueryBuilder: jest.Mock };
  let mockQb: Record<string, jest.Mock>;
  let mockSyncService: { getWatermarks: jest.Mock };

  const accountId = 'test-account-id';
  const account = { id: accountId } as Account;

  function buildMockQueryBuilder(rawResult: any) {
    const qb: Record<string, jest.Mock> = {};
    const self = () => qb;
    qb.innerJoin = jest.fn().mockImplementation(self);
    qb.where = jest.fn().mockImplementation(self);
    qb.andWhere = jest.fn().mockImplementation(self);
    qb.select = jest.fn().mockImplementation(self);
    qb.addSelect = jest.fn().mockImplementation(self);
    qb.getRawOne = jest.fn().mockResolvedValue(rawResult);
    return qb;
  }

  beforeEach(async () => {
    mockQb = buildMockQueryBuilder({ streams: '5', timeSeconds: '1200' });
    mockStreamRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    mockDataSource = {
      query: jest.fn(),
    };
    mockSyncService = {
      getWatermarks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Stream), useValue: mockStreamRepo },
        { provide: getRepositoryToken(Track), useValue: {} },
        { provide: getRepositoryToken(WorkoutSession), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
        { provide: SyncService, useValue: mockSyncService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getSpotifyStreamsDuringWorkouts', () => {
    it('should return parsed stream count and total time from the query', async () => {
      const result = await service.getSpotifyStreamsDuringWorkouts(account);

      expect(result).toEqual({ streams: 5, totalTimeSeconds: 1200 });
      expect(mockStreamRepo.createQueryBuilder).toHaveBeenCalledWith('st');
    });

    it('should filter by accountId and Spotify platform', async () => {
      await service.getSpotifyStreamsDuringWorkouts(account);

      expect(mockQb.where).toHaveBeenCalledWith(
        'st."accountId" = :accountId',
        { accountId },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'st.platform = :platform',
        { platform: StreamPlatform.SPOTIFY },
      );
    });

    it('should join on WorkoutSession and Track', async () => {
      await service.getSpotifyStreamsDuringWorkouts(account);

      expect(mockQb.innerJoin).toHaveBeenCalledTimes(2);
      // First join is WorkoutSession
      expect(mockQb.innerJoin.mock.calls[0][0]).toBe(WorkoutSession);
      expect(mockQb.innerJoin.mock.calls[0][1]).toBe('ws');
      // Second join is Track
      expect(mockQb.innerJoin.mock.calls[1][0]).toBe(Track);
      expect(mockQb.innerJoin.mock.calls[1][1]).toBe('t');
    });

    it('should apply from date filter when provided', async () => {
      const from = new Date('2025-01-01');
      await service.getSpotifyStreamsDuringWorkouts(account, { from });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'st."streamedAt" >= :from',
        { from },
      );
    });

    it('should apply to date filter when provided', async () => {
      const to = new Date('2025-12-31');
      await service.getSpotifyStreamsDuringWorkouts(account, { to });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'st."streamedAt" <= :to',
        { to },
      );
    });

    it('should apply both from and to filters together', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      await service.getSpotifyStreamsDuringWorkouts(account, { from, to });

      const andWhereCalls = mockQb.andWhere.mock.calls;
      const fromCall = andWhereCalls.find((c: any[]) => c[0].includes('>= :from'));
      const toCall = andWhereCalls.find((c: any[]) => c[0].includes('<= :to'));
      expect(fromCall).toBeDefined();
      expect(toCall).toBeDefined();
    });

    it('should not apply date filters when opts is empty object', async () => {
      await service.getSpotifyStreamsDuringWorkouts(account, {});

      const andWhereCalls = mockQb.andWhere.mock.calls;
      const dateFilters = andWhereCalls.filter(
        (c: any[]) => c[0].includes(':from') || c[0].includes(':to'),
      );
      expect(dateFilters).toHaveLength(0);
    });

    it('should return zeros when getRawOne returns null', async () => {
      mockQb.getRawOne.mockResolvedValue(null);

      const result = await service.getSpotifyStreamsDuringWorkouts(account);

      expect(result).toEqual({ streams: 0, totalTimeSeconds: 0 });
    });

    it('should correctly parse string "0" values from the database', async () => {
      mockQb.getRawOne.mockResolvedValue({ streams: '0', timeSeconds: '0' });

      const result = await service.getSpotifyStreamsDuringWorkouts(account);

      expect(result).toEqual({ streams: 0, totalTimeSeconds: 0 });
    });

    it('should select COUNT and COALESCE(SUM) aggregates', async () => {
      await service.getSpotifyStreamsDuringWorkouts(account);

      expect(mockQb.select).toHaveBeenCalledWith('COUNT(*)', 'streams');
      expect(mockQb.addSelect).toHaveBeenCalledWith(
        'COALESCE(SUM(t.duration), 0)',
        'timeSeconds',
      );
    });
  });

  describe('getWorkoutHabitCorrelation', () => {
    it('should compute correlation when habits exist on both workout and rest days', async () => {
      mockDataSource.query
        // workout days query
        .mockResolvedValueOnce([
          { date: '2026-01-10' },
          { date: '2026-01-12' },
        ])
        // habit entries query
        .mockResolvedValueOnce([
          { date: '2026-01-10', status: 'success' },
          { date: '2026-01-10', status: 'failed' },
          { date: '2026-01-12', status: 'success' },
          { date: '2026-01-11', status: 'success' },
          { date: '2026-01-13', status: 'failed' },
        ]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      // Workout days: 2 success out of 3 entries = 67%
      expect(result.workoutDays.successful).toBe(2);
      expect(result.workoutDays.total).toBe(3);
      expect(result.workoutDays.completionRate).toBe(67);

      // Rest days: 1 success out of 2 entries = 50%
      expect(result.restDays.successful).toBe(1);
      expect(result.restDays.total).toBe(2);
      expect(result.restDays.completionRate).toBe(50);

      expect(result.totalWorkoutDays).toBe(2);
    });

    it('should pass accountId and 90-day-ago date to both queries', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getWorkoutHabitCorrelation(accountId);

      expect(mockDataSource.query).toHaveBeenCalledTimes(2);

      // Both calls should use the accountId as first param
      expect(mockDataSource.query.mock.calls[0][1][0]).toBe(accountId);
      expect(mockDataSource.query.mock.calls[1][1][0]).toBe(accountId);

      // Both calls should have a date string as second param (YYYY-MM-DD format)
      const dateParam0 = mockDataSource.query.mock.calls[0][1][1];
      const dateParam1 = mockDataSource.query.mock.calls[1][1][1];
      expect(dateParam0).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateParam1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return zero completion rates when there are no habit entries', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ date: '2026-01-10' }])
        .mockResolvedValueOnce([]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      expect(result.workoutDays.completionRate).toBe(0);
      expect(result.workoutDays.total).toBe(0);
      expect(result.restDays.completionRate).toBe(0);
      expect(result.restDays.total).toBe(0);
      expect(result.totalWorkoutDays).toBe(1);
    });

    it('should return zero workout days when there are no workouts', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { date: '2026-01-11', status: 'success' },
          { date: '2026-01-13', status: 'failed' },
        ]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      expect(result.totalWorkoutDays).toBe(0);
      expect(result.workoutDays.total).toBe(0);
      expect(result.workoutDays.successful).toBe(0);
      // All entries fall on rest days
      expect(result.restDays.total).toBe(2);
      expect(result.restDays.successful).toBe(1);
      expect(result.restDays.completionRate).toBe(50);
    });

    it('should handle all habits being successful on workout days (100%)', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ date: '2026-02-01' }])
        .mockResolvedValueOnce([
          { date: '2026-02-01', status: 'success' },
          { date: '2026-02-01', status: 'success' },
        ]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      expect(result.workoutDays.completionRate).toBe(100);
      expect(result.workoutDays.successful).toBe(2);
      expect(result.workoutDays.total).toBe(2);
    });

    it('should round completion rate to nearest integer', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ date: '2026-02-01' }])
        .mockResolvedValueOnce([
          { date: '2026-02-01', status: 'success' },
          { date: '2026-02-01', status: 'failed' },
          { date: '2026-02-01', status: 'failed' },
        ]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      // 1/3 = 33.33...% -> rounds to 33
      expect(result.workoutDays.completionRate).toBe(33);
    });

    it('should deduplicate workout dates via Set', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          { date: '2026-02-01' },
          { date: '2026-02-01' }, // duplicate from DB (shouldn't happen with DISTINCT, but Set handles it)
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getWorkoutHabitCorrelation(accountId);

      expect(result.totalWorkoutDays).toBe(1);
    });
  });

  describe('getWeeklySummary', () => {
    function setupWeeklyMocks(overrides?: {
      workouts?: any[];
      habits?: any[];
      spending?: any[];
      streams?: any[];
    }) {
      mockDataSource.query
        .mockResolvedValueOnce(overrides?.workouts ?? [{ count: '3' }])
        .mockResolvedValueOnce(overrides?.habits ?? [{ total: '10', completed: '7' }])
        .mockResolvedValueOnce(overrides?.spending ?? [{ total: '250.50' }])
        .mockResolvedValueOnce(overrides?.streams ?? [{ count: '42' }]);
    }

    it('should aggregate weekly data from all four domain queries', async () => {
      setupWeeklyMocks();

      const result = await service.getWeeklySummary(accountId);

      expect(result).toEqual({
        workouts: 3,
        habitsCompleted: 7,
        habitsTotal: 10,
        spending: 250.50,
        streams: 42,
      });
    });

    it('should pass accountId and 7-day-ago date to all queries', async () => {
      setupWeeklyMocks();

      await service.getWeeklySummary(accountId);

      expect(mockDataSource.query).toHaveBeenCalledTimes(4);
      for (let i = 0; i < 4; i++) {
        const params = mockDataSource.query.mock.calls[i][1];
        expect(params[0]).toBe(accountId);
        expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should return zeros when all queries return empty results', async () => {
      setupWeeklyMocks({
        workouts: [{}],
        habits: [{}],
        spending: [{}],
        streams: [{}],
      });

      const result = await service.getWeeklySummary(accountId);

      expect(result).toEqual({
        workouts: 0,
        habitsCompleted: 0,
        habitsTotal: 0,
        spending: 0,
        streams: 0,
      });
    });

    it('should return zeros when queries return empty arrays', async () => {
      setupWeeklyMocks({
        workouts: [],
        habits: [],
        spending: [],
        streams: [],
      });

      const result = await service.getWeeklySummary(accountId);

      // parseInt(undefined[0]?.count) || 0 => 0
      expect(result).toEqual({
        workouts: 0,
        habitsCompleted: 0,
        habitsTotal: 0,
        spending: 0,
        streams: 0,
      });
    });

    it('should parse spending as float for decimal amounts', async () => {
      setupWeeklyMocks({
        spending: [{ total: '99.99' }],
      });

      const result = await service.getWeeklySummary(accountId);

      expect(result.spending).toBe(99.99);
    });

    it('should query workouts from app_workout_session', async () => {
      setupWeeklyMocks();

      await service.getWeeklySummary(accountId);

      const workoutQuery = mockDataSource.query.mock.calls[0][0];
      expect(workoutQuery).toContain('app_workout_session');
    });

    it('should query habits with join on app_habit for account scoping', async () => {
      setupWeeklyMocks();

      await service.getWeeklySummary(accountId);

      const habitsQuery = mockDataSource.query.mock.calls[1][0];
      expect(habitsQuery).toContain('app_habit_entry');
      expect(habitsQuery).toContain('app_habit');
    });

    it('should exclude income and transfer/refund types from spending', async () => {
      setupWeeklyMocks();

      await service.getWeeklySummary(accountId);

      const spendingQuery = mockDataSource.query.mock.calls[2][0];
      expect(spendingQuery).toContain('app_finance_transactions');
      expect(spendingQuery).toContain('WHERE "accountId" = $1 AND "transactionDate" >= $2');
      expect(spendingQuery).toContain('"isIncome" = false');
      expect(spendingQuery).toContain('NOT IN (1, 3)');
    });

    it('should query streams with track join for account filtering', async () => {
      setupWeeklyMocks();

      await service.getWeeklySummary(accountId);

      const streamsQuery = mockDataSource.query.mock.calls[3][0];
      expect(streamsQuery).toContain('app_stream');
      expect(streamsQuery).toContain('app_track');
      expect(streamsQuery).toContain('WHERE t."accountId" = $1 AND s."streamedAt" >= $2');
    });

    it('should handle zero spending as numeric 0 not string', async () => {
      setupWeeklyMocks({
        spending: [{ total: '0' }],
      });

      const result = await service.getWeeklySummary(accountId);

      // parseFloat('0') is 0, which is falsy, so || 0 applies -> still 0
      expect(result.spending).toBe(0);
      expect(typeof result.spending).toBe('number');
    });
  });

  describe('getDashboardIntelligence', () => {
    it('should assemble a momentum brief with actionable insights and AI prompts', async () => {
      jest.spyOn(service, 'getWeeklySummary').mockResolvedValue({
        workouts: 4,
        habitsCompleted: 19,
        habitsTotal: 24,
        spending: 182.4,
        streams: 96,
      });
      jest.spyOn(service, 'getWorkoutHabitCorrelation').mockResolvedValue({
        workoutDays: { completionRate: 81, total: 16, successful: 13 },
        restDays: { completionRate: 54, total: 20, successful: 11 },
        totalWorkoutDays: 7,
      });

      const result = await service.getDashboardIntelligence(accountId);

      expect(result.focus).toBe('momentum');
      expect(result.headline).toContain('Momentum');
      expect(result.score).toBeGreaterThan(70);
      expect(result.snapshot).toEqual([
        expect.objectContaining({ id: 'training', value: '4 sessions' }),
        expect.objectContaining({ id: 'habits', value: '79%' }),
        expect.objectContaining({ id: 'spending', value: '$182' }),
        expect.objectContaining({ id: 'media', value: '96 streams' }),
      ]);
      expect(result.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'habit-workout-correlation',
            domains: ['workout', 'habits'],
          }),
          expect.objectContaining({
            id: 'spending-watch',
            domains: ['finance'],
          }),
        ]),
      );
      expect(result.aiPrompts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'training-pattern',
            pageContext: expect.objectContaining({ pageType: 'dashboard' }),
          }),
        ]),
      );
    });

    it('should downgrade the focus when consistency is low and habits trail on workout days', async () => {
      jest.spyOn(service, 'getWeeklySummary').mockResolvedValue({
        workouts: 1,
        habitsCompleted: 5,
        habitsTotal: 21,
        spending: 486.12,
        streams: 18,
      });
      jest.spyOn(service, 'getWorkoutHabitCorrelation').mockResolvedValue({
        workoutDays: { completionRate: 22, total: 9, successful: 2 },
        restDays: { completionRate: 43, total: 14, successful: 6 },
        totalWorkoutDays: 2,
      });

      const result = await service.getDashboardIntelligence(accountId);

      expect(result.focus).toBe('attention');
      expect(result.headline).toContain('Attention');
      expect(result.score).toBeLessThan(45);
      expect(result.insights[0]).toEqual(
        expect.objectContaining({
          id: 'habit-workout-correlation',
          tone: 'warning',
        }),
      );
      expect(result.aiPrompts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'course-correct' }),
        ]),
      );
    });
  });

  describe('getMobileSnapshot', () => {
    it('should assemble the native app first-screen data in one account-scoped snapshot', async () => {
      jest.spyOn(service, 'getDashboardIntelligence').mockResolvedValue({
        generatedAt: '2026-06-24T08:00:00.000Z',
        focus: 'steady',
        score: 58,
        headline: 'Steady day',
        summary: 'Mobile snapshot intelligence',
        snapshot: [],
        insights: [],
        aiPrompts: [],
      });
      jest.spyOn(service, 'getWeeklySummary').mockResolvedValue({
        workouts: 3,
        habitsCompleted: 9,
        habitsTotal: 12,
        spending: 250.75,
        streams: 91,
      });
      jest.spyOn(service, 'getWorkoutHabitCorrelation').mockResolvedValue({
        workoutDays: { completionRate: 75, total: 8, successful: 6 },
        restDays: { completionRate: 50, total: 4, successful: 2 },
        totalWorkoutDays: 3,
      });
      mockSyncService.getWatermarks.mockResolvedValue({
        'habit-entry': 11,
        stream: 21,
      });
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            habitId: 'habit-1',
            habitName: 'Sleep',
            habitIconName: 'moon',
            habitColor: '#a78bfa',
            frequencyType: 'daily',
            trackingType: 'boolean',
            numericUnit: null,
            todayStatus: 'success',
            numericValue: null,
            comment: null,
            completedToday: true,
            currentStreak: '3',
            longestStreak: '9',
            successRate: '72.5',
          },
        ])
        .mockResolvedValueOnce([{ date: '2026-06-24', count: '1' }])
        .mockResolvedValueOnce([
          {
            totalWorkouts: '12',
            totalSets: '40',
            totalReps: '320',
            totalVolume: '16000',
            totalTimeSeconds: '28800',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'session-active',
            title: 'Push',
            date: '2026-06-24',
            startAt: '2026-06-24T07:00:00.000Z',
            endAt: null,
            setCount: '4',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'session-1',
            title: 'Legs',
            date: '2026-06-23',
            startAt: '2026-06-23T07:00:00.000Z',
            endAt: '2026-06-23T08:00:00.000Z',
            setCount: '12',
          },
        ])
        .mockResolvedValueOnce([
          {
            totalIncome: '1000.25',
            totalExpense: '250.75',
            incomeCount: '1',
            expenseCount: '7',
          },
        ])
        .mockResolvedValueOnce([
          {
            totalStreams: '91',
            msListened: '123000',
            uniqueTracks: '44',
            uniqueArtists: '20',
            lastStream: '2026-06-24T09:00:00.000Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            rank: '1',
            accountId: 'account-1',
            displayName: 'Arianna',
            spotifyUserId: '11145917586',
            streamCount: '91',
            uniqueTracks: '44',
            msListened: '123000',
            lastStream: '2026-06-24T09:00:00.000Z',
          },
        ]);

      const result = await (service as any).getMobileSnapshot(account);

      expect(result).toEqual(
        expect.objectContaining({
          accountId,
          generatedAt: expect.any(String),
          sync: {
            checkedAt: expect.any(String),
            watermarks: { 'habit-entry': 11, stream: 21 },
          },
          intelligence: expect.objectContaining({ focus: 'steady' }),
          weeklySummary: expect.objectContaining({ streams: 91 }),
          workoutHabitCorrelation: expect.objectContaining({ totalWorkoutDays: 3 }),
          habits: expect.objectContaining({
            total: 1,
            completedToday: 1,
            incompleteToday: 0,
            completionPct: 100,
            dailyCompletions: [{ date: '2026-06-24', count: 1 }],
            today: [
              expect.objectContaining({
                habitId: 'habit-1',
                habitName: 'Sleep',
                todayStatus: 'success',
                completedToday: true,
              }),
            ],
          }),
          workout: expect.objectContaining({
            totals: {
              totalWorkouts: 12,
              totalSets: 40,
              totalReps: 320,
              totalVolume: 16000,
              totalTimeSeconds: 28800,
            },
            activeSession: expect.objectContaining({ id: 'session-active' }),
            recentSessions: [expect.objectContaining({ id: 'session-1', setCount: 12 })],
          }),
          finance: expect.objectContaining({
            summary: expect.objectContaining({
              totalIncome: 1000.25,
              totalExpense: 250.75,
              netBalance: 749.5,
              expenseCount: 7,
            }),
            monthlySpent: 250.75,
          }),
          spotify: expect.objectContaining({
            stats: expect.objectContaining({
              totalStreams: 91,
              uniqueArtists: 20,
            }),
            rankingPreview: [
              expect.objectContaining({
                rank: 1,
                displayName: 'Arianna',
                streamCount: 91,
              }),
            ],
          }),
        }),
      );
      expect(mockSyncService.getWatermarks).toHaveBeenCalledWith(accountId);
    });
  });

  describe('getLandingStats', () => {
    it('should aggregate public landing metrics from the data source', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '184' }])
        .mockResolvedValueOnce([{ count: '8421' }])
        .mockResolvedValueOnce([{ count: '126734' }]);

      const result = await service.getLandingStats();

      expect(result).toEqual({
        generatedAt: expect.any(String),
        metrics: [
          expect.objectContaining({
            id: 'workouts',
            value: 184,
            suffix: '+',
            label: 'Workout sessions captured',
          }),
          expect.objectContaining({
            id: 'habits',
            value: 8421,
            suffix: '+',
            label: 'Habit check-ins preserved',
          }),
          expect.objectContaining({
            id: 'streams',
            value: 126734,
            suffix: '+',
            label: 'Listening events mapped',
          }),
        ],
      });
    });

    it('should return zeroed metrics when the database returns no rows', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ count: null }]);

      const result = await service.getLandingStats();

      expect(result.metrics).toEqual([
        expect.objectContaining({ id: 'workouts', value: 0 }),
        expect.objectContaining({ id: 'habits', value: 0 }),
        expect.objectContaining({ id: 'streams', value: 0 }),
      ]);
    });

    it('should query the expected source tables for landing metrics', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '1' }])
        .mockResolvedValueOnce([{ count: '1' }])
        .mockResolvedValueOnce([{ count: '1' }]);

      await service.getLandingStats();

      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
      expect(mockDataSource.query.mock.calls[0][0]).toContain('app_workout_session');
      expect(mockDataSource.query.mock.calls[1][0]).toContain('app_habit_entry');
      expect(mockDataSource.query.mock.calls[2][0]).toContain('app_stream');
    });
  });
});
