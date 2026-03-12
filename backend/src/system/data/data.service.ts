import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cache } from 'cache-manager';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async deleteWorkoutData(accountId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Order matters: sets → sessions, routine-exercises → routines, bodyweight, exercises, categories
      await qr.query(`DELETE FROM workout_set WHERE "sessionId" IN (SELECT id FROM workout_session WHERE "accountId" = $1)`, [accountId]);
      await qr.query(`DELETE FROM workout_session WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM routine_exercise WHERE "routineId" IN (SELECT id FROM routine WHERE "accountId" = $1)`, [accountId]);
      await qr.query(`DELETE FROM routine WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM body_weight_entry WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM workout_exercise WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM workout_category WHERE "accountId" = $1`, [accountId]);
      await qr.commitTransaction();
      await this.cacheManager.reset();
      this.logger.log(`Deleted all workout data for account ${accountId}`);
      return { success: true, module: 'workout' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async deleteFinanceData(accountId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Transactions first (FK to wallets, categories, subscriptions)
      await qr.query(`DELETE FROM finance_transactions WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM finance_subscriptions WHERE "accountId" = $1`, [accountId]);
      // Subcategories first, then parent categories
      await qr.query(`DELETE FROM finance_categories WHERE "accountId" = $1 AND "parentCategoryId" IS NOT NULL`, [accountId]);
      await qr.query(`DELETE FROM finance_categories WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM finance_wallets WHERE "accountId" = $1`, [accountId]);
      await qr.commitTransaction();
      await this.cacheManager.reset();
      this.logger.log(`Deleted all finance data for account ${accountId}`);
      return { success: true, module: 'finance' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async deleteHabitsData(accountId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(`DELETE FROM habit_entry WHERE "habitId" IN (SELECT id FROM habit WHERE "accountId" = $1)`, [accountId]);
      await qr.query(`DELETE FROM habit WHERE "accountId" = $1`, [accountId]);
      await qr.commitTransaction();
      await this.cacheManager.reset();
      this.logger.log(`Deleted all habits data for account ${accountId}`);
      return { success: true, module: 'habits' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async deleteMusicData(accountId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Streams reference tracks; tracks reference albums and artists
      await qr.query(`DELETE FROM stream WHERE "accountId" = $1`, [accountId]);
      // Tracks, albums, artists, playlists are account-owned
      await qr.query(`DELETE FROM track WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM album WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM artist WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM playlist WHERE "accountId" = $1`, [accountId]);
      await qr.commitTransaction();
      await this.cacheManager.reset();
      this.logger.log(`Deleted all music data for account ${accountId}`);
      return { success: true, module: 'music' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async deleteChatData(accountId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(`DELETE FROM chat_message WHERE "accountId" = $1`, [accountId]);
      await qr.query(`DELETE FROM chat_conversation WHERE "accountId" = $1`, [accountId]);
      await qr.commitTransaction();
      await this.cacheManager.reset();
      this.logger.log(`Deleted all chat data for account ${accountId}`);
      return { success: true, module: 'chat' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
