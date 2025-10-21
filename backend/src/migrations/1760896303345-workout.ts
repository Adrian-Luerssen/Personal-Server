import { MigrationInterface, QueryRunner } from "typeorm";

export class Workout1760896303345 implements MigrationInterface {
    name = 'Workout1760896303345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app_workout_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "startAt" TIMESTAMP NOT NULL, "endAt" TIMESTAMP, "date" date NOT NULL, "title" character varying(200), "notes" text, CONSTRAINT "PK_a42006a8b0b3f0cce043564cef5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0597e4ad0ba14e42b7fa9e4f45" ON "app_workout_session" ("accountId", "date") `);
        await queryRunner.query(`CREATE TABLE "app_workout_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" text, CONSTRAINT "PK_96ad36591056d6d53f4dc508054" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_22a85c11529e23cecbf9971f71" ON "app_workout_category" ("accountId", "name") `);
        await queryRunner.query(`CREATE TABLE "app_workout_exercise" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "name" character varying(200) NOT NULL, "muscleGroup" character varying, "categoryId" uuid, "notes" text, CONSTRAINT "PK_d5d50d9412cc81c92161b2c8f36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7924805ba4967e8e31d2a41a3e" ON "app_workout_exercise" ("accountId", "name") `);
        await queryRunner.query(`CREATE TABLE "app_workout_set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "sessionId" uuid NOT NULL, "exerciseId" uuid, "order" integer NOT NULL DEFAULT '0', "reps" integer, "weight" numeric, "distance" numeric, "durationSec" integer, "rpe" double precision, "notes" text, CONSTRAINT "PK_0040efd24997156c81d85bf9af3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e510da1d1b108c82c8c6fa3b1a" ON "app_workout_set" ("accountId", "sessionId") `);
        await queryRunner.query(`CREATE TABLE "app_routine_exercise" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "routineId" uuid NOT NULL, "exerciseId" uuid, "order" integer NOT NULL DEFAULT '0', "prescription" character varying(200), CONSTRAINT "PK_9fe406a4f694e8c0556792ad5d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5ef2321430e1b78117afbdab1f" ON "app_routine_exercise" ("accountId", "routineId", "order") `);
        await queryRunner.query(`CREATE TABLE "app_routine" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" text, CONSTRAINT "PK_471c0093091e1ef9cb1035b1e59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_eafd4d95aecf9ed9e97814475a" ON "app_routine" ("accountId", "name") `);
        await queryRunner.query(`CREATE TABLE "app_body_weight_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid NOT NULL, "date" date NOT NULL, "weightKg" numeric NOT NULL, "note" text, CONSTRAINT "PK_b330248ec494211b21a7a916113" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1d3f62883aa9e20e3df6ce3295" ON "app_body_weight_entry" ("accountId", "date") `);
        await queryRunner.query(`ALTER TABLE "app_workout_session" ADD CONSTRAINT "FK_2de9fe71a3fa07dda15e8209e42" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_workout_category" ADD CONSTRAINT "FK_aee186b1044bdcb57811898db37" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_workout_exercise" ADD CONSTRAINT "FK_0da1b63e67108c92fd8117769ba" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_workout_exercise" ADD CONSTRAINT "FK_207e978540e1c67a9d8bcb1a5e5" FOREIGN KEY ("categoryId") REFERENCES "app_workout_category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" ADD CONSTRAINT "FK_38adfe4d590ccc863567bfab17b" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" ADD CONSTRAINT "FK_45b87d013c0ecaa6185aa204b88" FOREIGN KEY ("sessionId") REFERENCES "app_workout_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" ADD CONSTRAINT "FK_371afca061f10a95bc8ce1c5fca" FOREIGN KEY ("exerciseId") REFERENCES "app_workout_exercise"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" ADD CONSTRAINT "FK_c0229b8289fd9070cc0eaf755f5" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" ADD CONSTRAINT "FK_f6cc826c6f988d33650a9a2e4fb" FOREIGN KEY ("routineId") REFERENCES "app_routine"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" ADD CONSTRAINT "FK_a53a0f157d1e3f1d75d437f93d5" FOREIGN KEY ("exerciseId") REFERENCES "app_workout_exercise"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "app_routine" ADD CONSTRAINT "FK_1df831910722cfb93ac487f71d3" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE "app_body_weight_entry" ADD CONSTRAINT "FK_40bb9088b843721e0ec2b67071f" FOREIGN KEY ("accountId") REFERENCES "app_account"("id") ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_body_weight_entry" DROP CONSTRAINT "FK_40bb9088b843721e0ec2b67071f"`);
        await queryRunner.query(`ALTER TABLE "app_routine" DROP CONSTRAINT "FK_1df831910722cfb93ac487f71d3"`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" DROP CONSTRAINT "FK_a53a0f157d1e3f1d75d437f93d5"`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" DROP CONSTRAINT "FK_f6cc826c6f988d33650a9a2e4fb"`);
        await queryRunner.query(`ALTER TABLE "app_routine_exercise" DROP CONSTRAINT "FK_c0229b8289fd9070cc0eaf755f5"`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" DROP CONSTRAINT "FK_371afca061f10a95bc8ce1c5fca"`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" DROP CONSTRAINT "FK_45b87d013c0ecaa6185aa204b88"`);
        await queryRunner.query(`ALTER TABLE "app_workout_set" DROP CONSTRAINT "FK_38adfe4d590ccc863567bfab17b"`);
        await queryRunner.query(`ALTER TABLE "app_workout_exercise" DROP CONSTRAINT "FK_207e978540e1c67a9d8bcb1a5e5"`);
        await queryRunner.query(`ALTER TABLE "app_workout_exercise" DROP CONSTRAINT "FK_0da1b63e67108c92fd8117769ba"`);
        await queryRunner.query(`ALTER TABLE "app_workout_category" DROP CONSTRAINT "FK_aee186b1044bdcb57811898db37"`);
        await queryRunner.query(`ALTER TABLE "app_workout_session" DROP CONSTRAINT "FK_2de9fe71a3fa07dda15e8209e42"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d3f62883aa9e20e3df6ce3295"`);
        await queryRunner.query(`DROP TABLE "app_body_weight_entry"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eafd4d95aecf9ed9e97814475a"`);
        await queryRunner.query(`DROP TABLE "app_routine"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5ef2321430e1b78117afbdab1f"`);
        await queryRunner.query(`DROP TABLE "app_routine_exercise"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e510da1d1b108c82c8c6fa3b1a"`);
        await queryRunner.query(`DROP TABLE "app_workout_set"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7924805ba4967e8e31d2a41a3e"`);
        await queryRunner.query(`DROP TABLE "app_workout_exercise"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22a85c11529e23cecbf9971f71"`);
        await queryRunner.query(`DROP TABLE "app_workout_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0597e4ad0ba14e42b7fa9e4f45"`);
        await queryRunner.query(`DROP TABLE "app_workout_session"`);
    }

}
