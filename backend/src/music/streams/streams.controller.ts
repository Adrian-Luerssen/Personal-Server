// ...existing code...
import { Controller, Get, Param, Query, Post, Body } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import {
  CrudAccountOwnedEntity,
  CrudAccountAuth,
} from "../../system/common/CrudEntity.decorator";
import { Stream, StreamPlatform } from "./stream.entity";
import { StreamsService } from "./streams.service";
import { ReqUser, NoAuth } from "../../system/auth/auth.decorator";

@CrudAccountOwnedEntity({
  model: { type: Stream },
})
@CrudAccountAuth()
@ApiBearerAuth("access-token")
@Controller("streams")
export class StreamsController implements CrudController<Stream> {
  constructor(public service: StreamsService) {}

  @Get("per-day")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async perDay(
    @ReqUser() user: any,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getStreamsPerDay(user.id, { timeframe, from, to });
  }

  @Get("per-hour")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async perHour(
    @ReqUser() user: any,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getStreamsPerHour(user.id, { timeframe, from, to });
  }

  @Get("track/:trackId")
  async getStreamsForTrack(
    @Param("trackId") trackId: string,
    @ReqUser() user: any
  ) {
    return this.service.getTrackStreams(user.id, trackId);
  }

  @Get("track/:trackId/by-platform")
  async byPlatform(@Param("trackId") trackId: string, @ReqUser() user: any) {
    return this.service.getTrackStreamsByPlatform(user.id, trackId);
  }

  @Get("track/:trackId/over-time")
  @ApiQuery({
    name: "granularity",
    enum: ["day", "week", "month"],
    required: false,
  })
  async overTime(
    @Param("trackId") trackId: string,
    @ReqUser() user: any,
    @Query("granularity") granularity: "day" | "week" | "month" = "day"
  ) {
    return this.service.getTrackStreamsOverTime(user.id, trackId, granularity);
  }

  @Get("top")
  @ApiQuery({ name: "platform", enum: StreamPlatform })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async top(
    @ReqUser() user: any,
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getTopTracksByPlatform(
      user.id,
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }

  @Post("ingest")
  async ingest(@Body() body: Partial<Stream>, @ReqUser() user: any) {
    return this.service.ingestStream(user.id, body);
  }

  @Get("mood")
  @ApiQuery({ name: "timeframe", required: false, description: "today | 7d | 30d | 90d | 1y | all" })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  async mood(
    @ReqUser() user: any,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getMoodAnalysis(user.id, { timeframe, from, to });
  }

  @Get("stats")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async stats(
    @ReqUser() user: any,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getStats(user.id, { timeframe, from, to });
  }

  @Get("history")
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (1-based)",
    schema: { default: 1 },
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    description: "Items per page",
    schema: { default: 10 },
  })
  async history(
    @ReqUser() user: any,
    @Query("page") page: string = "1",
    @Query("pageSize") pageSize: string = "10"
  ) {
    return this.service.getStreamsHistory(
      user.id,
      Number(page),
      Number(pageSize)
    );
  }

  @Get("user-ranking")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | week | month | 6m | year | all",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum users to return",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async userRanking(
    @Query("timeframe") timeframe?: string,
    @Query("limit") limit = 50,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getSpotifyUserRanking({
      timeframe,
      limit: Number(limit),
      from,
      to,
    });
  }

  // ===== GLOBAL ENDPOINTS (all users, no auth) =====

  @NoAuth()
  @Get("global-stats")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async globalStats(
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getGlobalStats({ timeframe, from, to });
  }

  @NoAuth()
  @Get("global-top")
  @ApiQuery({ name: "platform", enum: StreamPlatform })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async globalTop(
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getGlobalTopTracksByPlatform(platform, Number(limit), {
      timeframe,
      from,
      to,
    });
  }

  @NoAuth()
  @Get("global-top-artists")
  @ApiQuery({ name: "platform", enum: StreamPlatform })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  @NoAuth()
  @Get("global-history")
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (1-based)",
    schema: { default: 1 },
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    description: "Items per page",
    schema: { default: 10 },
  })
  async globalHistory(
    @Query("page") page: string = "1",
    @Query("pageSize") pageSize: string = "10"
  ) {
    return this.service.getGlobalStreamsHistory(Number(page), Number(pageSize));
  }

  @NoAuth()
  @Get("global-per-day")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async globalPerDay(
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getGlobalStreamsPerDay({ timeframe, from, to });
  }

  @NoAuth()
  @Get("global-per-hour")
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "today | 7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async globalPerHour(
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.getGlobalStreamsPerHour({ timeframe, from, to });
  }
}
