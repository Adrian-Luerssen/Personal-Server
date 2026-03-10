import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutExercise } from "./exercise.entity";
import { Cache } from "cache-manager";

@Injectable()
export class WorkoutExercisesService extends TypeOrmCrudService<WorkoutExercise> {
  constructor(
    @InjectRepository(WorkoutExercise) repo,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    super(repo);
  }
  /**
   * Get all exercises, with category and muscle group populated
   */
  async getAllExercises() {
    return this.repo.find({
      relations: ["category"],
      order: { name: "ASC" },
    });
  }

  /**
   * Create a new exercise
   */
  async createExercise(body: {
    name: string;
    categoryId: string;
    muscleGroup: string;
  }) {
    const exercise = this.repo.create({
      name: body.name,
      categoryId: body.categoryId,
      muscleGroup: body.muscleGroup,
    });
    const result = await this.repo.save(exercise);
    await this.cacheManager.reset();
    return result;
  }

  /**
   * Update an exercise
   */
  async updateExercise(
    exerciseId: string,
    body: { name: string; categoryId: string; muscleGroup: string }
  ) {
    const exercise = await this.repo.findOne({ where: { id: exerciseId } });
    if (!exercise) throw new Error("Exercise not found");
    exercise.name = body.name;
    exercise.categoryId = body.categoryId;
    exercise.muscleGroup = body.muscleGroup;
    const result = await this.repo.save(exercise);
    await this.cacheManager.reset();
    return result;
  }

  /**
   * Delete an exercise
   */
  async deleteExercise(exerciseId: string) {
    await this.repo.delete(exerciseId);
    await this.cacheManager.reset();
    return { success: true };
  }

  /**
   * Get exercise history (sessions and sets) for a given exercise
   */
  async getExerciseHistory(exerciseId: string) {
    const exercise = await this.repo.findOne({
      where: { id: exerciseId },
      relations: ["sets", "sets.session"],
      order: { sets: { session: { date: "DESC" } } },
    });
    if (!exercise) throw new Error("Exercise not found");
    return exercise.sets;
  }
}
