import { Body, Controller, Param, Post, Patch } from "@nestjs/common";
import { Delete } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { WorkoutSet } from "./set.entity";
import { WorkoutSetsService } from "./sets.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@CrudAccountOwnedEntity({
  model: { type: WorkoutSet },
})
@ApiBearerAuth("access-token")
@Controller("workout/sets")
export class WorkoutSetsController implements CrudController<WorkoutSet> {
  constructor(public service: WorkoutSetsService) {}

  @Post("/session/:sessionId/add")
  async addSet(
    @ReqUser() account: Account,
    @Param("sessionId") sessionId: string,
    @Body()
    body: {
      exerciseId?: string;
      order?: number;
      reps?: number;
      weight?: number;
      distance?: number;
      durationSec?: number;
      rpe?: number;
      notes?: string;
    }
  ) {
    return this.service.addSet(account, sessionId, body);
  }

  @Patch("/session/:sessionId/reorder")
  async reorder(
    @ReqUser() account: Account,
    @Param("sessionId") sessionId: string,
    @Body() body: { order: Array<{ id: string; order: number }> }
  ) {
    return this.service.reorderSets(account, sessionId, body.order);
  }

  @Delete(":setId")
  async deleteSet(@ReqUser() account: Account, @Param("setId") setId: string) {
    return this.service.deleteSet(account, setId);
  }
}
