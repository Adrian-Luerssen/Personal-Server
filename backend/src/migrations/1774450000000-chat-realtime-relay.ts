import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatRealtimeRelay1774450000000 implements MigrationInterface {
  name = 'ChatRealtimeRelay1774450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "app_chat_status" ADD VALUE IF NOT EXISTS 'finished'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_chat_conversation_status') THEN
          CREATE TYPE "app_chat_conversation_status" AS ENUM ('active', 'closed');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "app_chat_conversation"
      ADD COLUMN IF NOT EXISTS "status" "app_chat_conversation_status" NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "app_chat_message"
      ADD COLUMN IF NOT EXISTS "tokenUsage" JSONB,
      ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_account_activity"
      ON "app_chat_conversation" ("accountId", "lastActivityAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_message_account_status"
      ON "app_chat_message" ("accountId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_message_account_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversation_account_activity"`);
    await queryRunner.query(`ALTER TABLE "app_chat_message" DROP COLUMN IF EXISTS "readAt"`);
    await queryRunner.query(`ALTER TABLE "app_chat_message" DROP COLUMN IF EXISTS "tokenUsage"`);
    await queryRunner.query(`ALTER TABLE "app_chat_conversation" DROP COLUMN IF EXISTS "closedAt"`);
    await queryRunner.query(`ALTER TABLE "app_chat_conversation" DROP COLUMN IF EXISTS "lastActivityAt"`);
    await queryRunner.query(`ALTER TABLE "app_chat_conversation" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_chat_conversation_status"`);
  }
}
