import { MigrationInterface, QueryRunner } from "typeorm";

export class Workout1760913966581 implements MigrationInterface {
    name = 'Workout1760913966581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_workout_category" ADD "color" character varying(7) NOT NULL DEFAULT '#FFFFFF'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_workout_category" DROP COLUMN "color"`);
    }

}
