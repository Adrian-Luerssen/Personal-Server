import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaItem1773652173397 implements MigrationInterface {
    name = 'AddMediaItem1773652173397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create media_item table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "app_media_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "title" character varying(500) NOT NULL, "type" character varying(10) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'planning', "rating" numeric(3,1), "startDate" date, "endDate" date, "notes" text, "coverUrl" character varying(1000), "metadata" jsonb NOT NULL DEFAULT '{}', "externalIds" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_e4ac67669e47e7e52d5c8807898" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_6ce3b30872eea8504f161f92e2" ON "app_media_item" ("accountId", "title", "type") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_77ff4f0f827afc60b5b7dd988b" ON "app_media_item" ("accountId", "status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d095271eedf3f15f3f60e3ffa5" ON "app_media_item" ("accountId", "type") `);

        // FK: media_item -> account
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_71353e31926d2efbb7613642cb3') THEN ALTER TABLE "app_media_item" ADD CONSTRAINT "FK_71353e31926d2efbb7613642cb3" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT; END IF; END $$`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_media_item" DROP CONSTRAINT IF EXISTS "FK_71353e31926d2efbb7613642cb3"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d095271eedf3f15f3f60e3ffa5"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_77ff4f0f827afc60b5b7dd988b"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6ce3b30872eea8504f161f92e2"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "app_media_item"`);
    }
}
