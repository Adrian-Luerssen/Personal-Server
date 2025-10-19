import { MigrationInterface, QueryRunner } from "typeorm";

export class Track1760745983846 implements MigrationInterface {
    name = 'Track1760745983846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_track" DROP CONSTRAINT "UQ_cd517be6a9bd1e4fa507078fcf6"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_track" ADD CONSTRAINT "UQ_cd517be6a9bd1e4fa507078fcf6" UNIQUE ("isrc")`);
    }

}
