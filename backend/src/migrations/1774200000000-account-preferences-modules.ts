import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountPreferencesModules1774200000000
  implements MigrationInterface
{
  name = "AccountPreferencesModules1774200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_account_preferences"
      ADD COLUMN IF NOT EXISTS "featureModules" jsonb,
      ADD COLUMN IF NOT EXISTS "homeLayout" jsonb,
      ADD COLUMN IF NOT EXISTS "widgetLayout" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_account_preferences"
      DROP COLUMN IF EXISTS "widgetLayout",
      DROP COLUMN IF EXISTS "homeLayout",
      DROP COLUMN IF EXISTS "featureModules"
    `);
  }
}
