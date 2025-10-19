import { MigrationInterface, QueryRunner } from "typeorm";

export class Track1760746139049 implements MigrationInterface {
    name = 'Track1760746139049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_album" DROP CONSTRAINT "UQ_0e7de32939ea200554799b56399"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_album" ADD CONSTRAINT "UQ_0e7de32939ea200554799b56399" UNIQUE ("upc")`);
    }

}
