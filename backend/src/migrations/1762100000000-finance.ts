import { MigrationInterface, QueryRunner } from "typeorm";

export class Finance1762100000000 implements MigrationInterface {
  name = "Finance1762100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wallets
    await queryRunner.query(`
      CREATE TABLE "finance_wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "colour" character varying,
        "iconName" character varying,
        "currency" character varying NOT NULL DEFAULT 'EUR',
        "order" integer NOT NULL DEFAULT 0,
        "externalId" character varying,
        CONSTRAINT "PK_finance_wallets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_finance_wallets_account" ON "finance_wallets" ("accountId")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_finance_wallets_external" ON "finance_wallets" ("accountId", "externalId")
      WHERE "externalId" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_wallets"
        ADD CONSTRAINT "FK_finance_wallets_account"
        FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT
    `);

    // Categories
    await queryRunner.query(`
      CREATE TABLE "finance_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "colour" character varying,
        "iconName" character varying,
        "isIncome" boolean NOT NULL DEFAULT false,
        "parentCategoryId" uuid,
        "externalId" character varying,
        CONSTRAINT "PK_finance_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_finance_categories_account" ON "finance_categories" ("accountId")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_finance_categories_external" ON "finance_categories" ("accountId", "externalId")
      WHERE "externalId" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_categories"
        ADD CONSTRAINT "FK_finance_categories_account"
        FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_categories"
        ADD CONSTRAINT "FK_finance_categories_parent"
        FOREIGN KEY ("parentCategoryId") REFERENCES "finance_categories"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Transactions
    await queryRunner.query(`
      CREATE TABLE "finance_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "name" character varying(500) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "note" text,
        "categoryId" uuid,
        "walletId" uuid,
        "transactionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isIncome" boolean NOT NULL DEFAULT false,
        "isPaid" boolean NOT NULL DEFAULT true,
        "type" integer,
        "externalId" character varying,
        CONSTRAINT "PK_finance_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_finance_transactions_account_date" ON "finance_transactions" ("accountId", "transactionDate")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_finance_transactions_external" ON "finance_transactions" ("accountId", "externalId")
      WHERE "externalId" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_account"
        FOREIGN KEY ("accountId") REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_category"
        FOREIGN KEY ("categoryId") REFERENCES "finance_categories"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_wallet"
        FOREIGN KEY ("walletId") REFERENCES "finance_wallets"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "finance_transactions" DROP CONSTRAINT "FK_finance_transactions_wallet"`);
    await queryRunner.query(`ALTER TABLE "finance_transactions" DROP CONSTRAINT "FK_finance_transactions_category"`);
    await queryRunner.query(`ALTER TABLE "finance_transactions" DROP CONSTRAINT "FK_finance_transactions_account"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_transactions_external"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_transactions_account_date"`);
    await queryRunner.query(`DROP TABLE "finance_transactions"`);

    await queryRunner.query(`ALTER TABLE "finance_categories" DROP CONSTRAINT "FK_finance_categories_parent"`);
    await queryRunner.query(`ALTER TABLE "finance_categories" DROP CONSTRAINT "FK_finance_categories_account"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_categories_external"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_categories_account"`);
    await queryRunner.query(`DROP TABLE "finance_categories"`);

    await queryRunner.query(`ALTER TABLE "finance_wallets" DROP CONSTRAINT "FK_finance_wallets_account"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_wallets_external"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_finance_wallets_account"`);
    await queryRunner.query(`DROP TABLE "finance_wallets"`);
  }
}
