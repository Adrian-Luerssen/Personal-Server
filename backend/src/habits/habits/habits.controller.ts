import {
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { HabitsService } from "./habits.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Habits")
@ApiBearerAuth("access-token")
@Controller("habits")
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  // ========== HABIT CRUD ==========

  @Get()
  @ApiOperation({ summary: "List all habits for the authenticated account" })
  async findAll(@ReqUser() account: Account) {
    return this.habitsService.findAll(account);
  }

  @Get("summary")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @ApiOperation({
    summary: "Get all habits with current streak, longest streak, and success rate",
  })
  async getSummary(@ReqUser() account: Account) {
    return this.habitsService.getAllStreaks(account);
  }

  @Get("trends")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @ApiOperation({
    summary: "Get daily habit completions for the last 7 days (sparkline data)",
  })
  async getTrends(@ReqUser() account: Account) {
    const dailyCompletions =
      await this.habitsService.getDailyCompletions(account);
    return { dailyCompletions };
  }

  @Get("calendar/:month")
  @ApiOperation({
    summary: "Get calendar view for all habits for a given month",
    description: "Returns all entries for all habits in a given month (YYYY-MM)",
  })
  @ApiParam({ name: "month", description: "Month in YYYY-MM format" })
  async getCalendar(
    @ReqUser() account: Account,
    @Param("month") month: string
  ) {
    return this.habitsService.getCalendar(account, month);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single habit by ID" })
  async findOne(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.habitsService.findOne(account, id);
  }

  @Get(":id/streak")
  @ApiOperation({ summary: "Get current and longest streak for a habit" })
  async getStreak(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.habitsService.getStreak(account, id);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Get success rate and totals for a habit" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["week", "month", "year"],
    description: "Time period filter",
  })
  async getStats(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("period") period?: "week" | "month" | "year"
  ) {
    return this.habitsService.getStats(account, id, period);
  }

  @Post()
  @ApiOperation({ summary: "Create a new habit" })
  async create(
    @ReqUser() account: Account,
    @Body()
    body: {
      name: string;
      description?: string;
      emoji?: string;
      isActive?: boolean;
      color?: string;
    }
  ) {
    return this.habitsService.create(account, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a habit" })
  async update(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string;
      emoji: string;
      isActive: boolean;
      color: string;
    }>
  ) {
    return this.habitsService.update(account, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a habit and all its entries" })
  async remove(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    await this.habitsService.remove(account, id);
    return { success: true };
  }
}
