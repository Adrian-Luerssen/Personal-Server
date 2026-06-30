import { QueryRunner } from "typeorm";
import { AccountPreferencesModules1774200000000 } from "./1774200000000-account-preferences-modules";

describe("AccountPreferencesModules1774200000000", () => {
  let migration: AccountPreferencesModules1774200000000;
  let queryRunner: Pick<QueryRunner, "query">;

  beforeEach(() => {
    migration = new AccountPreferencesModules1774200000000();
    queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("adds module, home, and widget preference columns", async () => {
    await migration.up(queryRunner as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(`
      ALTER TABLE "app_account_preferences"
      ADD COLUMN IF NOT EXISTS "featureModules" jsonb,
      ADD COLUMN IF NOT EXISTS "homeLayout" jsonb,
      ADD COLUMN IF NOT EXISTS "widgetLayout" jsonb
    `);
  });

  it("drops module, home, and widget preference columns on rollback", async () => {
    await migration.down(queryRunner as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(`
      ALTER TABLE "app_account_preferences"
      DROP COLUMN IF EXISTS "widgetLayout",
      DROP COLUMN IF EXISTS "homeLayout",
      DROP COLUMN IF EXISTS "featureModules"
    `);
  });
});
