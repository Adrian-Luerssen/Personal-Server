import { Controller } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { RoutineExercise } from "./routine-exercise.entity";
import { RoutineExercisesService } from "./routine-exercises.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";

@CrudAccountOwnedEntity({
  model: { type: RoutineExercise },
})
@ApiBearerAuth("access-token")
@Controller("workout/routine-exercises")
export class RoutineExercisesController
  implements CrudController<RoutineExercise>
{
  constructor(public service: RoutineExercisesService) {}
}
