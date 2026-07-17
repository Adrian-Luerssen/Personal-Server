import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountRoles1784300000000 implements MigrationInterface {
  name = "AccountRoles1784300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE \"app_account\" ADD COLUMN IF NOT EXISTS \"role\" character varying NOT NULL DEFAULT 'regular' CHECK (\"role\" IN ('regular', 'admin'))"
    );
    await queryRunner.query(
      'UPDATE "app_account" SET "role" = \'admin\' WHERE LOWER("email") = \'root@gmail.com\''
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "app_account" DROP COLUMN IF EXISTS "role"'
    );
  }
}
