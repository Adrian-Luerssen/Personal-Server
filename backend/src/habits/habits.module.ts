import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Habit } from "./entities/habit.entity";
import { HabitEntry } from "./entities/habit-entry.entity";

import { HabitsService } from "./habits/habits.service";
import { HabitsController } from "./habits/habits.controller";

import { EntriesService } from "./entries/entries.service";
import { EntriesController } from "./entries/entries.controller";

import { HabitShareImportService } from "./import/habitshare-import.service";
import { HabitShareImportController } from "./import/import.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Habit, HabitEntry])],
  providers: [HabitsService, EntriesService, HabitShareImportService],
  controllers: [
    HabitsController,
    EntriesController,
    HabitShareImportController,
  ],
  exports: [HabitsService, EntriesService],
})
export class HabitsModule {}
