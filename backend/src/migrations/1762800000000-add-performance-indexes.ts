import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1762800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Transaction indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_date" ON "app_transaction" ("transactionDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_wallet" ON "app_transaction" ("walletId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_category" ON "app_transaction" ("categoryId")`);

    // Habit entry indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_habit_entry_date" ON "app_habit_entry" ("date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_habit_entry_habit" ON "app_habit_entry" ("habitId")`);

    // Stream indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stream_played_at" ON "app_stream" ("playedAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_wallet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_habit_entry_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_habit_entry_habit"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stream_played_at"`);
  }
}
