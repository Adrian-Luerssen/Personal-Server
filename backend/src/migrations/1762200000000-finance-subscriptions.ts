import { MigrationInterface, QueryRunner } from "typeorm";

export class FinanceSubscriptions1762200000000 implements MigrationInterface {
  name = "FinanceSubscriptions1762200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Subscriptions table
    await queryRunner.query(`
      CREATE TABLE "app_finance_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "isIncome" boolean NOT NULL DEFAULT false,
        "frequency" character varying(20) NOT NULL,
        "billingDay" integer NOT NULL,
        "billingMonth" integer,
        "walletId" uuid,
        "categoryId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastGeneratedDate" date,
        "note" text,
        CONSTRAINT "PK_app_finance_subscriptions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_app_finance_subscriptions_account" ON "app_finance_subscriptions" ("accountId")`);
    await queryRunner.query(`
      ALTER TABLE "app_finance_subscriptions"
        ADD CONSTRAINT "FK_app_finance_subscriptions_account"
        FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "app_finance_subscriptions"
        ADD CONSTRAINT "FK_app_finance_subscriptions_wallet"
        FOREIGN KEY ("walletId") REFERENCES "app_finance_wallets"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "app_finance_subscriptions"
        ADD CONSTRAINT "FK_app_finance_subscriptions_category"
        FOREIGN KEY ("categoryId") REFERENCES "app_finance_categories"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Add linkedTransferId and subscriptionId to transactions
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" ADD "linkedTransferId" uuid`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" ADD "subscriptionId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "app_finance_transactions"
        ADD CONSTRAINT "FK_app_finance_transactions_subscription"
        FOREIGN KEY ("subscriptionId") REFERENCES "app_finance_subscriptions"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP CONSTRAINT "FK_app_finance_transactions_subscription"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP COLUMN "subscriptionId"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP COLUMN "linkedTransferId"`);

    await queryRunner.query(`ALTER TABLE "app_finance_subscriptions" DROP CONSTRAINT "FK_app_finance_subscriptions_category"`);
    await queryRunner.query(`ALTER TABLE "app_finance_subscriptions" DROP CONSTRAINT "FK_app_finance_subscriptions_wallet"`);
    await queryRunner.query(`ALTER TABLE "app_finance_subscriptions" DROP CONSTRAINT "FK_app_finance_subscriptions_account"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_app_finance_subscriptions_account"`);
    await queryRunner.query(`DROP TABLE "app_finance_subscriptions"`);
  }
}
