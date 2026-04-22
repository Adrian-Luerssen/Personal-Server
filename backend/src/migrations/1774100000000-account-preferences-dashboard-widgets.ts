import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountPreferencesDashboardWidgets1774100000000
  implements MigrationInterface
{
  name = "AccountPreferencesDashboardWidgets1774100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_account_preferences"
      ADD COLUMN IF NOT EXISTS "dashboardWidgets" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_account_preferences"
      DROP COLUMN IF EXISTS "dashboardWidgets"
    `);
  }
}
