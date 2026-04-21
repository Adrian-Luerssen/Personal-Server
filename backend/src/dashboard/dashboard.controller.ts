import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { NoAuth, ReqUser } from "../system/auth/auth.decorator";
import { Account } from "../system/accounts/account.entity";
import { resolveTimeframe } from "../utils/utils";

@ApiTags("dashboard")
@ApiBearerAuth("access-token")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("streams/workout")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "Preset timeframe e.g. today, 7d, 30d, 1y, all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO start datetime override",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO end datetime override",
  })
  async getSpotifyStreamsDuringWorkouts(
    @ReqUser() account: Account,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const res = await this.dashboard.getSpotifyStreamsDuringWorkouts(account, {
      from: start,
      to: end,
    });
    return res;
  }

  @Get("insights/workout-habits")
  async getWorkoutHabitCorrelation(@ReqUser() account: Account) {
    return this.dashboard.getWorkoutHabitCorrelation(account.id);
  }

  @Get("insights/weekly")
  async getWeeklySummary(@ReqUser() account: Account) {
    return this.dashboard.getWeeklySummary(account.id);
  }

  @Get("intelligence")
  async getDashboardIntelligence(@ReqUser() account: Account) {
    return this.dashboard.getDashboardIntelligence(account.id);
  }

  @Get("landing-stats")
  @NoAuth()
  async getLandingStats() {
    return this.dashboard.getLandingStats();
  }
}
