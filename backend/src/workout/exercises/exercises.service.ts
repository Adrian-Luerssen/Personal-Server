import { Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkoutExercise } from "./exercise.entity";

@Injectable()
export class WorkoutExercisesService extends TypeOrmCrudService<WorkoutExercise> {
  constructor(@InjectRepository(WorkoutExercise) repo) {
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
    return this.repo.save(exercise);
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
    return this.repo.save(exercise);
  }

  /**
   * Delete an exercise
   */
  async deleteExercise(exerciseId: string) {
    await this.repo.delete(exerciseId);
    return { success: true };
  }
}
