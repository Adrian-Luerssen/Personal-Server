import { MigrationInterface, QueryRunner } from "typeorm";

export class Spotify1761125461447 implements MigrationInterface {
  name = "Spotify1761125461447";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_stream" ADD COLUMN "streamedAt_tmp" TIMESTAMP WITH TIME ZONE`
    );
    await queryRunner.query(
      `UPDATE "app_stream" SET "streamedAt_tmp" = "streamedAt" AT TIME ZONE 'UTC'`
    );
    await queryRunner.query(
      `ALTER TABLE "app_stream" DROP COLUMN "streamedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_stream" RENAME COLUMN "streamedAt_tmp" TO "streamedAt"`
    );

    // Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_e3920247ba3243e5a9eb19c02b" ON "app_stream" ("trackId", "streamedAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8dc537be26fdca7ffdb63dfcdc" ON "app_stream" ("platform", "streamedAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_081f24706eba0345cffc1f529e" ON "app_stream" ("trackId", "platform", "streamedAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_081f24706eba0345cffc1f529e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8dc537be26fdca7ffdb63dfcdc"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3920247ba3243e5a9eb19c02b"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_stream" DROP COLUMN "streamedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_stream" ADD "streamedAt" TIMESTAMP NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_081f24706eba0345cffc1f529e" ON "app_stream" ("platform", "streamedAt", "trackId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8dc537be26fdca7ffdb63dfcdc" ON "app_stream" ("platform", "streamedAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3920247ba3243e5a9eb19c02b" ON "app_stream" ("streamedAt", "trackId") `
    );
  }
}
