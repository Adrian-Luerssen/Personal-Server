import { MigrationInterface, QueryRunner } from "typeorm";

export class HabitsEnhancement1762900000000 implements MigrationInterface {
  name = "HabitsEnhancement1762900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to app_habit
    await queryRunner.query(`
      ALTER TABLE "app_habit"
        ADD COLUMN IF NOT EXISTS "iconName" varchar(50) DEFAULT 'circle-check',
        ADD COLUMN IF NOT EXISTS "trackingType" varchar(10) DEFAULT 'boolean',
        ADD COLUMN IF NOT EXISTS "frequencyType" varchar(10) DEFAULT 'daily',
        ADD COLUMN IF NOT EXISTS "frequencyTarget" integer DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "numericPassThreshold" decimal(10,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "numericSkipThreshold" decimal(10,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "numericUnit" varchar(30) DEFAULT NULL
    `);

    // Add numericValue to app_habit_entry
    await queryRunner.query(`
      ALTER TABLE "app_habit_entry"
        ADD COLUMN IF NOT EXISTS "numericValue" decimal(10,2) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_habit_entry"
        DROP COLUMN IF EXISTS "numericValue"
    `);

    await queryRunner.query(`
      ALTER TABLE "app_habit"
        DROP COLUMN IF EXISTS "numericUnit",
        DROP COLUMN IF EXISTS "numericSkipThreshold",
        DROP COLUMN IF EXISTS "numericPassThreshold",
        DROP COLUMN IF EXISTS "frequencyTarget",
        DROP COLUMN IF EXISTS "frequencyType",
        DROP COLUMN IF EXISTS "trackingType",
        DROP COLUMN IF EXISTS "iconName"
    `);
  }
}
