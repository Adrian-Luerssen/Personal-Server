import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { EntriesService } from "./entries.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { HabitStatus } from "../entities/habit-entry.entity";

@ApiTags("Habits")
@ApiBearerAuth("access-token")
@Controller("habits/:habitId/entries")
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  @ApiOperation({ summary: "Get all entries for a habit" })
  @ApiParam({ name: "habitId", type: "string", format: "uuid" })
  @ApiQuery({ name: "from", required: false, description: "Start date (YYYY-MM-DD)" })
  @ApiQuery({ name: "to", required: false, description: "End date (YYYY-MM-DD)" })
  async findAll(
    @ReqUser() account: Account,
    @Param("habitId", ParseUUIDPipe) habitId: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.entriesService.findByHabit(account, habitId, from, to);
  }

  @Post()
  @ApiOperation({ summary: "Add an entry for a habit on a specific date" })
  @ApiParam({ name: "habitId", type: "string", format: "uuid" })
  async addEntry(
    @ReqUser() account: Account,
    @Param("habitId", ParseUUIDPipe) habitId: string,
    @Body()
    body: {
      date: string;
      status: HabitStatus;
      comment?: string;
    }
  ) {
    return this.entriesService.addEntry(account, habitId, body);
  }

  @Patch(":date")
  @ApiOperation({ summary: "Update an entry for a habit by date" })
  @ApiParam({ name: "habitId", type: "string", format: "uuid" })
  @ApiParam({ name: "date", description: "Date in YYYY-MM-DD format" })
  async updateEntry(
    @ReqUser() account: Account,
    @Param("habitId", ParseUUIDPipe) habitId: string,
    @Param("date") date: string,
    @Body()
    body: {
      status?: HabitStatus;
      comment?: string;
    }
  ) {
    return this.entriesService.updateEntry(account, habitId, date, body);
  }

  @Delete(":date")
  @ApiOperation({ summary: "Delete an entry for a habit by date" })
  @ApiParam({ name: "habitId", type: "string", format: "uuid" })
  @ApiParam({ name: "date", description: "Date in YYYY-MM-DD format" })
  async removeEntry(
    @ReqUser() account: Account,
    @Param("habitId", ParseUUIDPipe) habitId: string,
    @Param("date") date: string
  ) {
    await this.entriesService.removeEntry(account, habitId, date);
    return { success: true };
  }
}
