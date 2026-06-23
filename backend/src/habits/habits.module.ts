import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";

import { Habit } from "./entities/habit.entity";
import { HabitEntry } from "./entities/habit-entry.entity";

import { HabitsService } from "./habits/habits.service";
import { HabitsController } from "./habits/habits.controller";

import { EntriesService } from "./entries/entries.service";
import { EntriesController } from "./entries/entries.controller";

import { HabitShareImportService } from "./import/habitshare-import.service";
import { HabitShareImportController } from "./import/import.controller";
import { SyncModule } from "../sync/sync.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Habit, HabitEntry]),
    MulterModule.register({ storage: undefined }), // memory storage (default)
    SyncModule,
  ],
  providers: [HabitsService, EntriesService, HabitShareImportService],
  controllers: [HabitsController, EntriesController, HabitShareImportController],
  exports: [HabitsService, EntriesService],
})
export class HabitsModule {}
