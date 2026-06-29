import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppVersions1774700000000 implements MigrationInterface {
  name = 'AppVersions1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "platform" character varying(40) NOT NULL DEFAULT 'android',
        "version" character varying(40) NOT NULL,
        "versionCode" integer,
        "releaseTag" character varying(80),
        "releaseName" character varying(180),
        "apkUrl" text,
        "minimumSupportedVersion" character varying(40) NOT NULL DEFAULT '0.0.0',
        "required" boolean NOT NULL DEFAULT false,
        "changelog" jsonb NOT NULL DEFAULT '{}',
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_app_versions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_app_versions_platform_version"
      ON "app_versions" ("platform", "version")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_app_versions_platform_published"
      ON "app_versions" ("platform", "publishedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_app_versions_platform_published"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_app_versions_platform_version"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_versions"`);
  }
}
