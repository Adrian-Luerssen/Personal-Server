import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { WorkoutExercise } from "./exercise.entity";
import { WorkoutExercisesService } from "./exercises.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";

@CrudAccountOwnedEntity({
  model: { type: WorkoutExercise },
})
@ApiBearerAuth("access-token")
@Controller("workout/exercises")
export class WorkoutExercisesController
  implements CrudController<WorkoutExercise>
{
  constructor(public service: WorkoutExercisesService) {}
  @Get()
  async getAll() {
    return this.service.getAllExercises();
  }

  @Post()
  async create(
    @Body() body: { name: string; categoryId: string; muscleGroup: string }
  ) {
    return this.service.createExercise(body);
  }

  @Put(":exerciseId")
  async update(
    @Param("exerciseId") exerciseId: string,
    @Body() body: { name: string; categoryId: string; muscleGroup: string }
  ) {
    return this.service.updateExercise(exerciseId, body);
  }

  @Delete(":exerciseId")
  async delete(@Param("exerciseId") exerciseId: string) {
    return this.service.deleteExercise(exerciseId);
  }
}
