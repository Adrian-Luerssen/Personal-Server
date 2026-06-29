import { MigrationInterface, QueryRunner } from 'typeorm';

export class Notifications1774300000000 implements MigrationInterface {
  name = 'Notifications1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "app_notification_source" AS ENUM ('agent', 'system'); EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "app_notification_category" AS ENUM ('assistant', 'habits', 'workout', 'finance', 'music', 'media', 'system', 'updates'); EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "app_notification_priority" AS ENUM ('low', 'normal', 'high'); EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "app_notification_status" AS ENUM ('pending', 'delivered', 'read', 'dismissed'); EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "agentKeyId" uuid,
        "source" "app_notification_source" NOT NULL,
        "category" "app_notification_category" NOT NULL DEFAULT 'assistant',
        "priority" "app_notification_priority" NOT NULL DEFAULT 'normal',
        "status" "app_notification_status" NOT NULL DEFAULT 'pending',
        "title" varchar(120) NOT NULL,
        "body" varchar(600) NOT NULL,
        "actionUrl" varchar(500),
        "scheduledFor" TIMESTAMP WITH TIME ZONE,
        "deliveredAt" TIMESTAMP WITH TIME ZONE,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "dismissedAt" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_notifications_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_app_notifications_agent_key" FOREIGN KEY ("agentKeyId")
          REFERENCES "app_agent_keys"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_notifications_pending" ON "app_notifications" ("accountId", "status", "scheduledFor", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_notifications_agent_key" ON "app_notifications" ("agentKeyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_app_notifications_agent_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_app_notifications_pending"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_notification_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_notification_priority"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_notification_category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_notification_source"`);
  }
}
