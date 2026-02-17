import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentKeys1762100000000 implements MigrationInterface {
  name = 'AgentKeys1762100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_agent_keys" (
        "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "accountId"    uuid NOT NULL,
        "name"         varchar(200) NOT NULL,
        "keyHash"      varchar(255) NOT NULL,
        "keyPrefix"    varchar(20) NOT NULL,
        "scopes"       text NOT NULL,
        "isActive"     boolean NOT NULL DEFAULT true,
        "lastUsedAt"   TIMESTAMPTZ,
        "expiresAt"    TIMESTAMPTZ,
        "metadata"     jsonb,
        "requestCount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_agent_keys" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "app_agent_keys"
        ADD CONSTRAINT "FK_agent_keys_account"
        FOREIGN KEY ("accountId")
        REFERENCES "app_account" ("id")
        ON DELETE CASCADE
        ON UPDATE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agent_keys_account_id"
        ON "app_agent_keys" ("accountId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agent_keys_prefix"
        ON "app_agent_keys" ("keyPrefix")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agent_keys_prefix_active"
        ON "app_agent_keys" ("keyPrefix", "isActive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_keys_prefix_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_keys_prefix"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_keys_account_id"`);
    await queryRunner.query(`
      ALTER TABLE "app_agent_keys"
        DROP CONSTRAINT IF EXISTS "FK_agent_keys_account"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_agent_keys"`);
  }
}
