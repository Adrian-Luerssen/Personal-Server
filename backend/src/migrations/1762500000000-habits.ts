import { MigrationInterface, QueryRunner } from "typeorm";

export class Habits1762500000000 implements MigrationInterface {
  name = "Habits1762500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create habit_status enum
    await queryRunner.query(
      `CREATE TYPE "public"."habit_status" AS ENUM('success', 'fail', 'skip')`
    );

    // Create habits table
    await queryRunner.query(
      `CREATE TABLE "app_habit" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "emoji" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "color" character varying,
        CONSTRAINT "PK_app_habit" PRIMARY KEY ("id")
      )`
    );

    // Unique index: accountId + name
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_app_habit_account_name" ON "app_habit" ("accountId", "name")`
    );

    // FK: habit -> account
    await queryRunner.query(
      `ALTER TABLE "app_habit"
        ADD CONSTRAINT "FK_app_habit_account"
        FOREIGN KEY ("accountId")
        REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT`
    );

    // Create habit_entries table
    await queryRunner.query(
      `CREATE TABLE "app_habit_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "habitId" uuid NOT NULL,
        "date" date NOT NULL,
        "status" "public"."habit_status" NOT NULL,
        "comment" text,
        CONSTRAINT "PK_app_habit_entry" PRIMARY KEY ("id")
      )`
    );

    // Unique index: habitId + date
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_app_habit_entry_habit_date" ON "app_habit_entry" ("habitId", "date")`
    );

    // Index: accountId (for account-scoped queries)
    await queryRunner.query(
      `CREATE INDEX "IDX_app_habit_entry_account" ON "app_habit_entry" ("accountId")`
    );

    // FK: entry -> account
    await queryRunner.query(
      `ALTER TABLE "app_habit_entry"
        ADD CONSTRAINT "FK_app_habit_entry_account"
        FOREIGN KEY ("accountId")
        REFERENCES "app_account"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT`
    );

    // FK: entry -> habit (cascade delete)
    await queryRunner.query(
      `ALTER TABLE "app_habit_entry"
        ADD CONSTRAINT "FK_app_habit_entry_habit"
        FOREIGN KEY ("habitId")
        REFERENCES "app_habit"("id")
        ON DELETE CASCADE ON UPDATE RESTRICT`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_habit_entry" DROP CONSTRAINT "FK_app_habit_entry_habit"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_habit_entry" DROP CONSTRAINT "FK_app_habit_entry_account"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_app_habit_entry_account"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_app_habit_entry_habit_date"`
    );
    await queryRunner.query(`DROP TABLE "app_habit_entry"`);

    await queryRunner.query(
      `ALTER TABLE "app_habit" DROP CONSTRAINT "FK_app_habit_account"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_app_habit_account_name"`
    );
    await queryRunner.query(`DROP TABLE "app_habit"`);

    await queryRunner.query(`DROP TYPE "public"."habit_status"`);
  }
}
