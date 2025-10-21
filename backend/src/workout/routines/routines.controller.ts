import { Controller } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Routine } from "./routine.entity";
import { RoutinesService } from "./routines.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";

@CrudAccountOwnedEntity({
  model: { type: Routine },
})
@ApiBearerAuth("access-token")
@Controller("workout/routines")
export class RoutinesController implements CrudController<Routine> {
  constructor(public service: RoutinesService) {}
}
