import { MigrationInterface, QueryRunner } from "typeorm";

export class StructuredMediaCatalog1783950000000 implements MigrationInterface {
  name = "StructuredMediaCatalog1783950000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_media_season" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "mediaItemId" uuid NOT NULL,
        "number" integer NOT NULL,
        "providerSeasonId" character varying(100),
        "name" character varying(500) NOT NULL,
        "overview" text,
        "posterUrl" character varying(1000),
        "airDate" date,
        "episodeCount" integer,
        CONSTRAINT "PK_media_season" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_season_account" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT "FK_media_season_item" FOREIGN KEY ("mediaItemId") REFERENCES "app_media_item"("id") ON DELETE CASCADE ON UPDATE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_media_season_item_number" ON "app_media_season" ("accountId", "mediaItemId", "number")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_media_episode" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "mediaItemId" uuid NOT NULL,
        "seasonId" uuid NOT NULL,
        "seasonNumber" integer NOT NULL,
        "number" integer NOT NULL,
        "providerEpisodeId" character varying(100),
        "title" character varying(500) NOT NULL,
        "overview" text,
        "airDate" date,
        "runtime" integer,
        "imageUrl" character varying(1000),
        "watched" boolean NOT NULL DEFAULT false,
        "watchedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_media_episode" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_episode_account" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT "FK_media_episode_item" FOREIGN KEY ("mediaItemId") REFERENCES "app_media_item"("id") ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT "FK_media_episode_season" FOREIGN KEY ("seasonId") REFERENCES "app_media_season"("id") ON DELETE CASCADE ON UPDATE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_media_episode_season_number" ON "app_media_episode" ("accountId", "seasonId", "number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_episode_item_watched" ON "app_media_episode" ("accountId", "mediaItemId", "watched")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_media_relation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "accountId" uuid NOT NULL,
        "sourceMediaItemId" uuid NOT NULL,
        "targetMediaItemId" uuid,
        "relationType" character varying(30) NOT NULL,
        "targetMalId" integer,
        "targetTitle" character varying(500) NOT NULL,
        "targetType" character varying(10) NOT NULL DEFAULT 'anime',
        "targetCoverUrl" character varying(1000),
        "targetYear" integer,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_media_relation" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_relation_account" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT "FK_media_relation_source" FOREIGN KEY ("sourceMediaItemId") REFERENCES "app_media_item"("id") ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT "FK_media_relation_target" FOREIGN KEY ("targetMediaItemId") REFERENCES "app_media_item"("id") ON DELETE SET NULL ON UPDATE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_media_relation_source_target" ON "app_media_relation" ("accountId", "sourceMediaItemId", "relationType", "targetMalId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_media_relation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_media_episode"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_media_season"`);
  }
}
