import { QueryRunner } from "typeorm";
import { AccountPreferencesDashboardWidgets1774100000000 } from "./1774100000000-account-preferences-dashboard-widgets";

describe("AccountPreferencesDashboardWidgets1774100000000", () => {
  let migration: AccountPreferencesDashboardWidgets1774100000000;
  let queryRunner: Pick<QueryRunner, "query">;

  beforeEach(() => {
    migration = new AccountPreferencesDashboardWidgets1774100000000();
    queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("should add the missing dashboardWidgets column to app_account_preferences", async () => {
    await migration.up(queryRunner as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(`
      ALTER TABLE "app_account_preferences"
      ADD COLUMN IF NOT EXISTS "dashboardWidgets" jsonb
    `);
  });

  it("should drop the dashboardWidgets column on rollback", async () => {
    await migration.down(queryRunner as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(`
      ALTER TABLE "app_account_preferences"
      DROP COLUMN IF EXISTS "dashboardWidgets"
    `);
  });
});
