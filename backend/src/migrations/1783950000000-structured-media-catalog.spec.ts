import { QueryRunner } from "typeorm";
import { StructuredMediaCatalog1783950000000 } from "./1783950000000-structured-media-catalog";

describe("StructuredMediaCatalog1783950000000", () => {
  let migration: StructuredMediaCatalog1783950000000;
  let queryRunner: Pick<QueryRunner, "query">;

  beforeEach(() => {
    migration = new StructuredMediaCatalog1783950000000();
    queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
  });

  it("creates account-owned seasons, episodes, and relations with stable provider identities", async () => {
    await migration.up(queryRunner as QueryRunner);

    const statements = (queryRunner.query as jest.Mock).mock.calls
      .map(([sql]) => String(sql))
      .join("\n");

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS "app_media_season"');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS "app_media_episode"');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS "app_media_relation"');
    expect(statements).toContain('REFERENCES "app_media_item"("id") ON DELETE CASCADE');
    expect(statements).toContain('REFERENCES "app_media_season"("id") ON DELETE CASCADE');
    expect(statements).toContain('"IDX_media_season_item_number"');
    expect(statements).toContain('"IDX_media_episode_season_number"');
    expect(statements).toContain('"IDX_media_relation_source_target"');
  });

  it("drops dependent catalog tables before seasons", async () => {
    await migration.down(queryRunner as QueryRunner);

    const statements = (queryRunner.query as jest.Mock).mock.calls
      .map(([sql]) => String(sql).trim())
      .filter(Boolean);

    expect(statements).toEqual([
      'DROP TABLE IF EXISTS "app_media_relation"',
      'DROP TABLE IF EXISTS "app_media_episode"',
      'DROP TABLE IF EXISTS "app_media_season"',
    ]);
  });
});
