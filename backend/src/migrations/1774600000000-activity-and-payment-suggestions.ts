import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivityAndPaymentSuggestions1774600000000 implements MigrationInterface {
  name = 'ActivityAndPaymentSuggestions1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_activity_daily_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "date" date NOT NULL,
        "source" character varying(80) NOT NULL DEFAULT 'health-connect',
        "steps" integer NOT NULL DEFAULT 0,
        "distanceMeters" integer,
        "activeCalories" integer,
        "sourcePackage" character varying(160),
        "syncedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_app_activity_daily_metrics" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_activity_daily_account_date_source"
      ON "app_activity_daily_metrics" ("accountId", "date", "source")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_daily_account_date"
      ON "app_activity_daily_metrics" ("accountId", "date")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_app_activity_daily_metrics_account'
        ) THEN
          ALTER TABLE "app_activity_daily_metrics"
            ADD CONSTRAINT "FK_app_activity_daily_metrics_account"
            FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
            ON DELETE CASCADE ON UPDATE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_finance_transaction_suggestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "sourceType" character varying(40) NOT NULL DEFAULT 'notification',
        "eventHash" character varying(240) NOT NULL,
        "sourcePackage" character varying(240),
        "sourceAppLabel" character varying(240),
        "merchantRaw" character varying(500) NOT NULL,
        "merchantNormalized" character varying(500),
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying(12) NOT NULL DEFAULT 'EUR',
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "confidence" double precision NOT NULL DEFAULT 0.7,
        "status" character varying(40) NOT NULL DEFAULT 'pending',
        "decidedAt" TIMESTAMP WITH TIME ZONE,
        "matchedTransactionId" uuid,
        CONSTRAINT "PK_app_finance_transaction_suggestions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_finance_suggestions_account_hash"
      ON "app_finance_transaction_suggestions" ("accountId", "eventHash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_finance_suggestions_account_status_date"
      ON "app_finance_transaction_suggestions" ("accountId", "status", "occurredAt")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_app_finance_suggestions_account'
        ) THEN
          ALTER TABLE "app_finance_transaction_suggestions"
            ADD CONSTRAINT "FK_app_finance_suggestions_account"
            FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
            ON DELETE CASCADE ON UPDATE RESTRICT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_app_finance_suggestions_transaction'
        ) THEN
          ALTER TABLE "app_finance_transaction_suggestions"
            ADD CONSTRAINT "FK_app_finance_suggestions_transaction"
            FOREIGN KEY ("matchedTransactionId") REFERENCES "app_finance_transactions"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_finance_transaction_suggestions" DROP CONSTRAINT IF EXISTS "FK_app_finance_suggestions_transaction"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transaction_suggestions" DROP CONSTRAINT IF EXISTS "FK_app_finance_suggestions_account"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_finance_suggestions_account_status_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_finance_suggestions_account_hash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_finance_transaction_suggestions"`);

    await queryRunner.query(`ALTER TABLE "app_activity_daily_metrics" DROP CONSTRAINT IF EXISTS "FK_app_activity_daily_metrics_account"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_activity_daily_account_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_activity_daily_account_date_source"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_activity_daily_metrics"`);
  }
}
