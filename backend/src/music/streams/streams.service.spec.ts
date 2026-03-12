// Mock @nestjsx/crud-typeorm to avoid filesystem read errors on Windows/OneDrive
jest.mock('@nestjsx/crud-typeorm', () => ({
  TypeOrmCrudService: class {
    constructor(public repo: any) {}
  },
}));

import { StreamsService } from './streams.service';
import { Stream } from './stream.entity';
import { Repository } from 'typeorm';

/**
 * Helper to build a mock query builder that resolves getRawMany with the given rows.
 */
function createMockQueryBuilder(rows: any[]) {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue(rows[0] ?? null),
    clone: jest.fn().mockReturnThis(),
  };
  return qb;
}

describe('StreamsService', () => {
  let service: StreamsService;
  let mockRepo: Partial<Repository<Stream>>;

  beforeEach(() => {
    mockRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      metadata: {
        columns: [],
        relations: [],
        connection: { options: { type: 'postgres' } },
      } as any,
      manager: { connection: { options: { type: 'postgres' } } } as any,
      target: Stream,
    };

    // Directly instantiate the service, bypassing Test.createTestingModule
    // to avoid TypeOrmCrudService initialization overhead
    service = new StreamsService(mockRepo as Repository<Stream>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getMoodAnalysis', () => {
    const accountId = 'test-account-id';

    it('should return null averages and distribution when no tracks have audioFeatures', async () => {
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder([]));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result).toEqual({
        totalTracks: 0,
        averages: null,
        distribution: null,
      });
    });

    it('should compute correct averages for a single track', async () => {
      const audioFeatures = {
        danceability: 0.8,
        energy: 0.6,
        valence: 0.7,
        acousticness: 0.3,
        instrumentalness: 0.0,
        speechiness: 0.05,
        liveness: 0.1,
      };

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        createMockQueryBuilder([{ audioFeatures, bpm: 120 }]),
      );

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.totalTracks).toBe(1);
      expect(result.averages).toEqual({
        danceability: 0.8,
        energy: 0.6,
        valence: 0.7,
        acousticness: 0.3,
        instrumentalness: 0,
        speechiness: 0.05,
        liveness: 0.1,
        bpm: 120,
      });
    });

    it('should compute correct averages across multiple tracks', async () => {
      const rows = [
        {
          audioFeatures: {
            danceability: 0.4,
            energy: 0.2,
            valence: 0.1,
            acousticness: 0.9,
            instrumentalness: 0.8,
            speechiness: 0.02,
            liveness: 0.05,
          },
          bpm: 80,
        },
        {
          audioFeatures: {
            danceability: 0.8,
            energy: 0.8,
            valence: 0.9,
            acousticness: 0.1,
            instrumentalness: 0.0,
            speechiness: 0.06,
            liveness: 0.15,
          },
          bpm: 140,
        },
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.totalTracks).toBe(2);
      // (0.4 + 0.8) / 2 = 0.6
      expect(result.averages.danceability).toBe(0.6);
      // (0.2 + 0.8) / 2 = 0.5
      expect(result.averages.energy).toBe(0.5);
      // (0.1 + 0.9) / 2 = 0.5
      expect(result.averages.valence).toBe(0.5);
      // (0.9 + 0.1) / 2 = 0.5
      expect(result.averages.acousticness).toBe(0.5);
      // (0.8 + 0.0) / 2 = 0.4
      expect(result.averages.instrumentalness).toBe(0.4);
      // (0.02 + 0.06) / 2 = 0.04
      expect(result.averages.speechiness).toBe(0.04);
      // (0.05 + 0.15) / 2 = 0.1
      expect(result.averages.liveness).toBe(0.1);
      // (80 + 140) / 2 = 110
      expect(result.averages.bpm).toBe(110);
    });

    it('should round averages to two decimal places', async () => {
      const rows = [
        {
          audioFeatures: {
            danceability: 0.1,
            energy: 0.1,
            valence: 0.1,
            acousticness: 0.1,
            instrumentalness: 0.1,
            speechiness: 0.1,
            liveness: 0.1,
          },
          bpm: 100,
        },
        {
          audioFeatures: {
            danceability: 0.2,
            energy: 0.2,
            valence: 0.2,
            acousticness: 0.2,
            instrumentalness: 0.2,
            speechiness: 0.2,
            liveness: 0.2,
          },
          bpm: 133,
        },
        {
          audioFeatures: {
            danceability: 0.3,
            energy: 0.3,
            valence: 0.3,
            acousticness: 0.3,
            instrumentalness: 0.3,
            speechiness: 0.3,
            liveness: 0.3,
          },
          bpm: 99,
        },
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      // (0.1 + 0.2 + 0.3) / 3 = 0.2 (exact)
      expect(result.averages.danceability).toBe(0.2);
      // BPM: (100 + 133 + 99) / 3 = 110.666... -> rounds to 111
      expect(result.averages.bpm).toBe(111);
    });

    it('should correctly bucket energy into low/medium/high', async () => {
      const rows = [
        { audioFeatures: { energy: 0.1, valence: 0.5 }, bpm: 90 },   // low energy
        { audioFeatures: { energy: 0.2, valence: 0.5 }, bpm: 90 },   // low energy
        { audioFeatures: { energy: 0.32, valence: 0.5 }, bpm: 90 },  // low energy (< 0.33)
        { audioFeatures: { energy: 0.33, valence: 0.5 }, bpm: 90 },  // medium energy (>= 0.33)
        { audioFeatures: { energy: 0.5, valence: 0.5 }, bpm: 90 },   // medium energy
        { audioFeatures: { energy: 0.65, valence: 0.5 }, bpm: 90 },  // medium energy (< 0.66)
        { audioFeatures: { energy: 0.66, valence: 0.5 }, bpm: 90 },  // high energy (>= 0.66)
        { audioFeatures: { energy: 0.9, valence: 0.5 }, bpm: 90 },   // high energy
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.distribution.energy).toEqual({
        low: 3,
        medium: 3,
        high: 2,
      });
    });

    it('should correctly bucket valence into sad/neutral/happy', async () => {
      const rows = [
        { audioFeatures: { energy: 0.5, valence: 0.0 }, bpm: 100 },   // sad
        { audioFeatures: { energy: 0.5, valence: 0.15 }, bpm: 100 },  // sad
        { audioFeatures: { energy: 0.5, valence: 0.32 }, bpm: 100 },  // sad (< 0.33)
        { audioFeatures: { energy: 0.5, valence: 0.33 }, bpm: 100 },  // neutral (>= 0.33)
        { audioFeatures: { energy: 0.5, valence: 0.5 }, bpm: 100 },   // neutral
        { audioFeatures: { energy: 0.5, valence: 0.66 }, bpm: 100 },  // happy (>= 0.66)
        { audioFeatures: { energy: 0.5, valence: 1.0 }, bpm: 100 },   // happy
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.distribution.mood).toEqual({
        sad: 3,
        neutral: 2,
        happy: 2,
      });
    });

    it('should handle audioFeatures stored as JSON string', async () => {
      const audioFeatures = JSON.stringify({
        danceability: 0.75,
        energy: 0.4,
        valence: 0.2,
        acousticness: 0.6,
        instrumentalness: 0.1,
        speechiness: 0.03,
        liveness: 0.08,
      });

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        createMockQueryBuilder([{ audioFeatures, bpm: 95 }]),
      );

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.totalTracks).toBe(1);
      expect(result.averages.danceability).toBe(0.75);
      expect(result.averages.energy).toBe(0.4);
      expect(result.averages.valence).toBe(0.2);
      // energy 0.4 -> medium; valence 0.2 -> sad
      expect(result.distribution.energy).toEqual({ low: 0, medium: 1, high: 0 });
      expect(result.distribution.mood).toEqual({ sad: 1, neutral: 0, happy: 0 });
    });

    it('should skip rows where audioFeatures is null after parsing', async () => {
      const rows = [
        {
          audioFeatures: {
            danceability: 0.5,
            energy: 0.5,
            valence: 0.5,
            acousticness: 0.5,
            instrumentalness: 0.5,
            speechiness: 0.5,
            liveness: 0.5,
          },
          bpm: 120,
        },
        { audioFeatures: null, bpm: 100 },
        { audioFeatures: null, bpm: 90 },
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      // Only 1 track has valid audioFeatures
      expect(result.totalTracks).toBe(1);
      expect(result.averages.danceability).toBe(0.5);
      expect(result.averages.bpm).toBe(120);
    });

    it('should handle tracks with no bpm', async () => {
      const rows = [
        {
          audioFeatures: {
            danceability: 0.5,
            energy: 0.5,
            valence: 0.5,
            acousticness: 0.5,
            instrumentalness: 0.5,
            speechiness: 0.5,
            liveness: 0.5,
          },
          bpm: null,
        },
        {
          audioFeatures: {
            danceability: 0.7,
            energy: 0.7,
            valence: 0.7,
            acousticness: 0.7,
            instrumentalness: 0.7,
            speechiness: 0.7,
            liveness: 0.7,
          },
          bpm: 140,
        },
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.totalTracks).toBe(2);
      // BPM should only average from tracks that have bpm: only 140/1 = 140
      expect(result.averages.bpm).toBe(140);
      // Other averages still computed from both tracks
      expect(result.averages.danceability).toBe(0.6);
    });

    it('should apply timeframe filter when start date is defined', async () => {
      const qb = createMockQueryBuilder([]);
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.getMoodAnalysis(accountId, { timeframe: '7d' });

      // The query builder should have andWhere called for the BETWEEN clause
      const betweenCall = qb.andWhere.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('BETWEEN'),
      );
      expect(betweenCall).toBeDefined();
      expect(betweenCall[1]).toHaveProperty('start');
      expect(betweenCall[1]).toHaveProperty('end');
    });

    it('should not apply timeframe BETWEEN filter for "all" timeframe', async () => {
      const qb = createMockQueryBuilder([]);
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      // No BETWEEN filter should be applied since resolveTimeframe("all") returns start: undefined
      const betweenCall = qb.andWhere.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('BETWEEN'),
      );
      expect(betweenCall).toBeUndefined();
    });

    it('should return bpm 0 when no tracks have bpm', async () => {
      const rows = [
        {
          audioFeatures: {
            danceability: 0.5,
            energy: 0.5,
            valence: 0.5,
            acousticness: 0.5,
            instrumentalness: 0.5,
            speechiness: 0.5,
            liveness: 0.5,
          },
          bpm: null,
        },
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.averages.bpm).toBe(0);
    });

    it('should handle mixed energy and valence values producing all distribution buckets', async () => {
      const rows = [
        { audioFeatures: { energy: 0.1, valence: 0.1 }, bpm: 80 },   // low/sad
        { audioFeatures: { energy: 0.5, valence: 0.5 }, bpm: 120 },  // medium/neutral
        { audioFeatures: { energy: 0.9, valence: 0.9 }, bpm: 160 },  // high/happy
      ];

      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(createMockQueryBuilder(rows));

      const result = await service.getMoodAnalysis(accountId, { timeframe: 'all' });

      expect(result.totalTracks).toBe(3);
      expect(result.distribution.energy).toEqual({ low: 1, medium: 1, high: 1 });
      expect(result.distribution.mood).toEqual({ sad: 1, neutral: 1, happy: 1 });
    });
  });
});
