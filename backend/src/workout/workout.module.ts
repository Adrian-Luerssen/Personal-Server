import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { WorkoutCategory } from "src/workout/categories/category.entity";
import { WorkoutExercise } from "src/workout/exercises/exercise.entity";
import { WorkoutSession } from "src/workout/sessions/session.entity";
import { WorkoutSet } from "src/workout/sets/set.entity";
import { BodyWeightEntry } from "src/workout/bodyweight/bodyweight.entity";
import { Routine } from "src/workout/routines/routine.entity";
import { RoutineExercise } from "src/workout/routines/routine-exercise.entity";

import { WorkoutCategoriesService } from "src/workout/categories/categories.service";
import { WorkoutExercisesService } from "src/workout/exercises/exercises.service";
import { WorkoutSessionsService } from "src/workout/sessions/sessions.service";
import { WorkoutSetsService } from "src/workout/sets/sets.service";
import { BodyWeightService } from "src/workout/bodyweight/bodyweight.service";
import { RoutinesService } from "src/workout/routines/routines.service";
import { RoutineExercisesService } from "src/workout/routines/routine-exercises.service";

import { WorkoutCategoriesController } from "src/workout/categories/categories.controller";
import { WorkoutExercisesController } from "src/workout/exercises/exercises.controller";
import { WorkoutSessionsController } from "src/workout/sessions/sessions.controller";
import { WorkoutSetsController } from "src/workout/sets/sets.controller";
import { BodyWeightController } from "src/workout/bodyweight/bodyweight.controller";
import { RoutinesController } from "src/workout/routines/routines.controller";
import { RoutineExercisesController } from "src/workout/routines/routine-exercises.controller";
import { WorkoutImportController } from "src/workout/import/import.controller";
import { FitNotesImportService } from "src/workout/import/fitnotes-import.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutCategory,
      WorkoutExercise,
      WorkoutSession,
      WorkoutSet,
      BodyWeightEntry,
      Routine,
      RoutineExercise,
    ]),
  ],
  providers: [
    WorkoutCategoriesService,
    WorkoutExercisesService,
    WorkoutSessionsService,
    WorkoutSetsService,
    BodyWeightService,
    RoutinesService,
    RoutineExercisesService,
    FitNotesImportService,
  ],
  controllers: [
    WorkoutCategoriesController,
    WorkoutExercisesController,
    WorkoutSessionsController,
    WorkoutSetsController,
    BodyWeightController,
    RoutinesController,
    RoutineExercisesController,
    WorkoutImportController,
  ],
})
export class WorkoutModule {}
