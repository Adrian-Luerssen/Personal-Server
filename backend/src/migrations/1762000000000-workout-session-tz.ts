import { MigrationInterface, QueryRunner } from "typeorm";

export class WorkoutSessionTz1762000000000 implements MigrationInterface {
  name = "WorkoutSessionTz1762000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert existing session timestamps to timestamptz, interpreting current values as Europe/Madrid local time
    await queryRunner.query(
      `ALTER TABLE "app_workout_session" ALTER COLUMN "startAt" TYPE timestamptz USING ("startAt" AT TIME ZONE 'Europe/Madrid')`
    );
    await queryRunner.query(
      `ALTER TABLE "app_workout_session" ALTER COLUMN "endAt" TYPE timestamptz USING (CASE WHEN "endAt" IS NULL THEN NULL ELSE ("endAt" AT TIME ZONE 'Europe/Madrid') END)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to timestamp without time zone (this will drop timezone info)
    await queryRunner.query(
      `ALTER TABLE "app_workout_session" ALTER COLUMN "startAt" TYPE timestamp without time zone USING ("startAt" AT TIME ZONE 'UTC')`
    );
    await queryRunner.query(
      `ALTER TABLE "app_workout_session" ALTER COLUMN "endAt" TYPE timestamp without time zone USING (CASE WHEN "endAt" IS NULL THEN NULL ELSE ("endAt" AT TIME ZONE 'UTC') END)`
    );
  }
}
