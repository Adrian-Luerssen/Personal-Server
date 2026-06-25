import { MigrationInterface, QueryRunner } from "typeorm";

export class SpotifyProfileImageUrl1774452000000
  implements MigrationInterface
{
  name = "SpotifyProfileImageUrl1774452000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_spotify_credentials" ADD COLUMN IF NOT EXISTS "profileImageUrl" character varying`
    );
    await queryRunner.query(
      `UPDATE "app_spotify_credentials"
       SET "profileImageUrl" = images->0->>'url'
       WHERE "profileImageUrl" IS NULL
        AND images IS NOT NULL
        AND CASE
          WHEN json_typeof(images) = 'array' THEN json_array_length(images) > 0
          ELSE false
        END`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_spotify_credentials" DROP COLUMN "profileImageUrl"`
    );
  }
}
