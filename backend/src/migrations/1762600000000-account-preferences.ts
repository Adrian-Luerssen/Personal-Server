import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountPreferences1762600000000 implements MigrationInterface {
  name = "AccountPreferences1762600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "app_theme_mode" AS ENUM ('dark', 'light', 'auto')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_sidebar_position" AS ENUM ('left', 'right')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_density" AS ENUM ('compact', 'comfortable', 'spacious')
    `);
    await queryRunner.query(`
      CREATE TABLE "app_account_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "accentColor" varchar(7) NOT NULL DEFAULT '#7dd3fc',
        "themeMode" "app_theme_mode" NOT NULL DEFAULT 'dark',
        "background" jsonb,
        "sidebarPosition" "app_sidebar_position" NOT NULL DEFAULT 'left',
        "density" "app_density" NOT NULL DEFAULT 'comfortable',
        "customCss" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_account_preferences_account" UNIQUE ("accountId"),
        CONSTRAINT "FK_account_preferences_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_account_preferences"`);
    await queryRunner.query(`DROP TYPE "app_density"`);
    await queryRunner.query(`DROP TYPE "app_sidebar_position"`);
    await queryRunner.query(`DROP TYPE "app_theme_mode"`);
  }
}
