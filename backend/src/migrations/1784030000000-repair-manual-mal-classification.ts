import { MigrationInterface, QueryRunner } from "typeorm";

export class RepairManualMalClassification1784030000000 implements MigrationInterface {
  name = "RepairManualMalClassification1784030000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "app_media_item" AS item
      SET
        "type" = 'anime',
        "metadata" = jsonb_set(COALESCE(item."metadata", '{}'::jsonb), '{tags}', '["anime"]'::jsonb, true)
      WHERE item."type" = 'tv'
        AND item."metadata"->>'manualMatch' = 'true'
        AND item."externalIds" ? 'malId'
        AND NOT EXISTS (
          SELECT 1
          FROM "app_media_item" AS existing
          WHERE existing."accountId" = item."accountId"
            AND lower(existing."title") = lower(item."title")
            AND existing."type" = 'anime'
            AND existing."id" <> item."id"
        )
    `);
  }

  public async down(): Promise<void> {
    // Canonical user-selected matches cannot be safely inferred back to TV.
  }
}
