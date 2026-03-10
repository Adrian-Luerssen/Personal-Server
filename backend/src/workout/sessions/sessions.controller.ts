import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Get,
  Delete,
  Query,
} from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { WorkoutSession } from "./session.entity";
import { WorkoutSessionsService } from "./sessions.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@CrudAccountOwnedEntity({
  model: { type: WorkoutSession },
})
@ApiBearerAuth("access-token")
@Controller("workout/sessions")
export class WorkoutSessionsController
  implements CrudController<WorkoutSession>
{
  constructor(public service: WorkoutSessionsService) {}

  @Get("trends")
  async getTrends(@ReqUser() account: Account) {
    const dailyVolume = await this.service.getWeeklyVolumeTrend(account);
    return { dailyVolume };
  }

  @Get("active")
  async getActive(@ReqUser() account: Account) {
    return await this.service.getActiveSession(account);
  }

  @Get("recent")
  async getRecent(@ReqUser() account: Account) {
    return this.service.getRecentSessions(account);
  }

  @Get()
  async getAll(
    @ReqUser() account: Account,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20
  ) {
    // Paginate sessions
    const {
      sessions,
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
      totalTimeSeconds,
    } = await this.service.getPaginatedSessions(account, page, limit);
    return {
      sessions,
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
      totalTimeSeconds,
    };
  }

  @Delete(":id")
  async deleteSession(@ReqUser() account: Account, @Param("id") id: string) {
    return await this.service.deleteSession(account, id);
  }

  @Post("start")
  async startSession(
    @ReqUser() account: Account,
    @Body()
    body: {
      date?: string; // YYYY-MM-DD; defaults to today
      title?: string;
      notes?: string;
      startAt?: string; // ISO override
    }
  ) {
    return await this.service.startSession(account, body);
  }

  @Patch(":id/end")
  async endSession(
    @ReqUser() account: Account,
    @Param("id") id: string,
    @Body()
    body: {
      endAt?: string; // ISO override
      notes?: string;
      title?: string;
    }
  ) {
    return await this.service.endSession(account, id, body);
  }
}
