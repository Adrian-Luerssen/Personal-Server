import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { DataService } from './data.service';
import { DataSource } from 'typeorm';

describe('DataService', () => {
  let service: DataService;
  let mockQueryRunner: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    mockCacheManager = {
      reset: jest.fn(),
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<DataService>(DataService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('deleteWorkoutData', () => {
    const accountId = 'test-account-id';

    it('should delete all workout data in correct FK order', async () => {
      const result = await service.deleteWorkoutData(accountId);

      expect(result).toEqual({ success: true, module: 'workout' });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // Verify correct deletion order (FK constraints)
      const queryCalls = mockQueryRunner.query.mock.calls;
      expect(queryCalls).toHaveLength(7);
      expect(queryCalls[0][0]).toContain('app_workout_set');
      expect(queryCalls[1][0]).toContain('app_workout_session');
      expect(queryCalls[2][0]).toContain('app_routine_exercise');
      expect(queryCalls[3][0]).toContain('app_routine');
      expect(queryCalls[4][0]).toContain('app_body_weight_entry');
      expect(queryCalls[5][0]).toContain('app_workout_exercise');
      expect(queryCalls[6][0]).toContain('app_workout_category');

      // Each query uses the accountId parameter
      queryCalls.forEach(call => {
        expect(call[1]).toEqual([accountId]);
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheManager.reset).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback and rethrow on query failure', async () => {
      const dbError = new Error('FK constraint violation');
      mockQueryRunner.query.mockRejectedValueOnce(dbError);

      await expect(service.deleteWorkoutData(accountId)).rejects.toThrow('FK constraint violation');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should release query runner even when rollback fails', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('query error'));
      mockQueryRunner.rollbackTransaction.mockRejectedValueOnce(new Error('rollback error'));

      await expect(service.deleteWorkoutData(accountId)).rejects.toThrow();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('deleteFinanceData', () => {
    const accountId = 'test-account-id';

    it('should delete all finance data in correct FK order', async () => {
      const result = await service.deleteFinanceData(accountId);

      expect(result).toEqual({ success: true, module: 'finance' });

      const queryCalls = mockQueryRunner.query.mock.calls;
      expect(queryCalls).toHaveLength(5);
      expect(queryCalls[0][0]).toContain('app_finance_transactions');
      expect(queryCalls[1][0]).toContain('app_finance_subscriptions');
      // Subcategories before parent categories
      expect(queryCalls[2][0]).toContain('app_finance_categories');
      expect(queryCalls[2][0]).toContain('parentCategoryId');
      expect(queryCalls[3][0]).toContain('app_finance_categories');
      expect(queryCalls[4][0]).toContain('app_finance_wallets');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheManager.reset).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('db error'));

      await expect(service.deleteFinanceData(accountId)).rejects.toThrow('db error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteHabitsData', () => {
    const accountId = 'test-account-id';

    it('should delete habit entries before habits', async () => {
      const result = await service.deleteHabitsData(accountId);

      expect(result).toEqual({ success: true, module: 'habits' });

      const queryCalls = mockQueryRunner.query.mock.calls;
      expect(queryCalls).toHaveLength(2);
      expect(queryCalls[0][0]).toContain('app_habit_entry');
      expect(queryCalls[1][0]).toContain('DELETE FROM app_habit');
      // Ensure it's not deleting habit_entry again
      expect(queryCalls[1][0]).not.toContain('app_habit_entry');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('db error'));

      await expect(service.deleteHabitsData(accountId)).rejects.toThrow('db error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteMusicData', () => {
    const accountId = 'test-account-id';

    it('should delete streams and playlists before tracks, albums, artists', async () => {
      const result = await service.deleteMusicData(accountId);

      expect(result).toEqual({ success: true, module: 'music' });

      const queryCalls = mockQueryRunner.query.mock.calls;
      expect(queryCalls).toHaveLength(5);
      expect(queryCalls[0][0]).toContain('app_stream');
      expect(queryCalls[1][0]).toContain('app_playlist');
      expect(queryCalls[2][0]).toContain('app_track');
      expect(queryCalls[3][0]).toContain('app_album');
      expect(queryCalls[4][0]).toContain('app_artist');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('db error'));

      await expect(service.deleteMusicData(accountId)).rejects.toThrow('db error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteChatData', () => {
    const accountId = 'test-account-id';

    it('should delete messages before conversations', async () => {
      const result = await service.deleteChatData(accountId);

      expect(result).toEqual({ success: true, module: 'chat' });

      const queryCalls = mockQueryRunner.query.mock.calls;
      expect(queryCalls).toHaveLength(2);
      expect(queryCalls[0][0]).toContain('app_chat_message');
      expect(queryCalls[1][0]).toContain('app_chat_conversation');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('db error'));

      await expect(service.deleteChatData(accountId)).rejects.toThrow('db error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
