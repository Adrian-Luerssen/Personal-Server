import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncChangeFeed1774451000000 implements MigrationInterface {
  name = 'SyncChangeFeed1774451000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_sync_operation') THEN
          CREATE TYPE "app_sync_operation" AS ENUM ('upsert', 'delete');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_sync_events" (
        "sequence" BIGSERIAL PRIMARY KEY,
        "accountId" uuid NOT NULL,
        "entityType" varchar(80) NOT NULL,
        "entityId" uuid NOT NULL,
        "operation" "app_sync_operation" NOT NULL,
        "payload" jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_sync_client_mutations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "clientMutationId" varchar(120) NOT NULL,
        "result" jsonb NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sync_client_mutation_account_id"
          UNIQUE ("accountId", "clientMutationId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_events_account_sequence"
      ON "app_sync_events" ("accountId", "sequence")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_events_account_entity"
      ON "app_sync_events" ("accountId", "entityType", "entityId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sync_events_account_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sync_events_account_sequence"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_sync_client_mutations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_sync_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "app_sync_operation"`);
  }
}
