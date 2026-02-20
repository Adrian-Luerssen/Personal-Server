import { MigrationInterface, QueryRunner } from "typeorm";

export class Mfa1761596234827 implements MigrationInterface {
    name = 'Mfa1761596234827'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_account" ADD "mfaSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "app_account" ADD "mfaEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3920247ba3243e5a9eb19c02b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8dc537be26fdca7ffdb63dfcdc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_081f24706eba0345cffc1f529e"`);
        await queryRunner.query(`ALTER TABLE "app_stream" ALTER COLUMN "streamedAt" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_e3920247ba3243e5a9eb19c02b" ON "app_stream" ("trackId", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8dc537be26fdca7ffdb63dfcdc" ON "app_stream" ("platform", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_081f24706eba0345cffc1f529e" ON "app_stream" ("trackId", "platform", "streamedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_081f24706eba0345cffc1f529e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8dc537be26fdca7ffdb63dfcdc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3920247ba3243e5a9eb19c02b"`);
        await queryRunner.query(`ALTER TABLE "app_stream" ALTER COLUMN "streamedAt" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_081f24706eba0345cffc1f529e" ON "app_stream" ("platform", "trackId", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8dc537be26fdca7ffdb63dfcdc" ON "app_stream" ("platform", "streamedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3920247ba3243e5a9eb19c02b" ON "app_stream" ("trackId", "streamedAt") `);
        await queryRunner.query(`ALTER TABLE "app_account" DROP COLUMN "mfaEnabled"`);
        await queryRunner.query(`ALTER TABLE "app_account" DROP COLUMN "mfaSecret"`);
    }

}
