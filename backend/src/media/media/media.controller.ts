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
  ApiTags,
} from "@nestjs/swagger";
import { MediaService } from "./media.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { MediaType, MediaStatus } from "../entities/media-item.entity";

@ApiTags("Media")
@ApiBearerAuth("access-token")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ========== LIST & FILTER ==========

  @Get()
  @ApiOperation({ summary: "List all media items with optional filters" })
  @ApiQuery({ name: "type", required: false, enum: MediaType })
  @ApiQuery({ name: "tag", required: false, description: "Filter by tag (anime, manga, tv, movie, book)" })
  @ApiQuery({ name: "status", required: false, enum: MediaStatus })
  @ApiQuery({ name: "search", required: false, description: "Title search" })
  async findAll(
    @ReqUser() account: Account,
    @Query("type") type?: MediaType,
    @Query("tag") tag?: string,
    @Query("status") status?: MediaStatus,
    @Query("search") search?: string
  ) {
    return this.mediaService.findAll(account, { type, tag, status, search });
  }

  // ========== STATS ==========

  @Get("stats")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @ApiOperation({
    summary: "Get media statistics",
    description:
      "Returns counts by type/status, average rating, ratings distribution",
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: MediaType,
    description: "Filter stats to a specific media type",
  })
  async getStats(
    @ReqUser() account: Account,
    @Query("type") type?: MediaType
  ) {
    return this.mediaService.getStats(account, type);
  }

  // ========== SINGLE ITEM ==========

  @Get(":id")
  @ApiOperation({ summary: "Get a single media item by ID" })
  async findOne(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.mediaService.findOne(account, id);
  }

  // ========== CREATE ==========

  @Post()
  @ApiOperation({ summary: "Create a new media item" })
  async create(
    @ReqUser() account: Account,
    @Body()
    body: {
      title: string;
      type: MediaType;
      status?: MediaStatus;
      rating?: number;
      startDate?: string;
      endDate?: string;
      notes?: string;
      coverUrl?: string;
      metadata?: Record<string, any>;
      externalIds?: Record<string, any>;
    }
  ) {
    return this.mediaService.create(account, body);
  }

  // ========== UPDATE ==========

  @Patch(":id")
  @ApiOperation({ summary: "Update a media item" })
  async update(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      title: string;
      type: MediaType;
      status: MediaStatus;
      rating: number;
      startDate: string;
      endDate: string;
      notes: string;
      coverUrl: string;
      metadata: Record<string, any>;
      externalIds: Record<string, any>;
    }>
  ) {
    return this.mediaService.update(account, id, body);
  }

  // ========== DELETE ==========

  @Delete(":id")
  @ApiOperation({ summary: "Delete a media item" })
  async remove(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    await this.mediaService.remove(account, id);
    return { success: true };
  }

  // ========== RE-CLASSIFY ==========

  @Post("reclassify")
  @ApiOperation({
    summary: "Reset classification on all items so enrichment re-processes them",
    description: "Clears reclassified flag and resets wrongly-classified items back to their original type.",
  })
  async reclassify(@ReqUser() account: Account) {
    return this.mediaService.resetClassification(account);
  }
}
