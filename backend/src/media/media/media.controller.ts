import {
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  BadRequestException,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
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
import { MediaCatalogService } from "../catalog/media-catalog.service";
import { Roles } from "../../system/auth/roles.decorator";
import { AccountRole } from "../../system/accounts/account.entity";
import { withMediaClassifications } from "./media-classification";

@ApiTags("Media")
@ApiBearerAuth("access-token")
@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaCatalogService: MediaCatalogService
  ) {}

  // ========== LIST & FILTER ==========

  @Get()
  @ApiOperation({ summary: "List all media items with optional filters" })
  @ApiQuery({ name: "type", required: false, enum: MediaType })
  @ApiQuery({
    name: "tag",
    required: false,
    description: "Filter by tag (anime, manga, tv, movie, book)",
  })
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
  async getStats(@ReqUser() account: Account, @Query("type") type?: MediaType) {
    return this.mediaService.getStats(account, type);
  }

  @Get("catalog/summaries")
  @ApiOperation({
    summary: "Get structured progress summaries for the library",
  })
  async getCatalogSummaries(@ReqUser() account: Account) {
    const items = await this.mediaService.findAll(account);
    return this.mediaCatalogService.getCatalogSummaries(account, items);
  }

  @Post("catalog/sync-remaining")
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: "Force synchronization of unfinished show catalogs",
  })
  async syncRemainingCatalogs(@ReqUser() account: Account) {
    return this.mediaCatalogService.syncRemainingItems(account);
  }

  @Get("catalog/anime/:malId")
  @ApiOperation({ summary: "Preview an untracked MAL anime release" })
  async getAnimePreview(@Param("malId", ParseIntPipe) malId: number) {
    return this.mediaCatalogService.getAnimePreview(malId);
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

  @Get(":id/catalog")
  @ApiOperation({
    summary: "Get structured seasons, episodes, and anime relations",
  })
  async getCatalog(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const item = await this.mediaService.findOne(account, id);
    return this.mediaCatalogService.getCatalog(account, item);
  }

  @Post(":id/catalog/sync")
  @ApiOperation({
    summary: "Synchronize seasons, episodes, or anime continuity",
  })
  async syncCatalog(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const item = await this.mediaService.findOne(account, id);
    return this.mediaCatalogService.syncItem(account, item);
  }

  @Patch(":id/episodes/:episodeId")
  @ApiOperation({ summary: "Mark a concrete episode watched or unwatched" })
  async setEpisodeWatched(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("episodeId", ParseUUIDPipe) episodeId: string,
    @Body() body: { watched: boolean }
  ) {
    if (typeof body?.watched !== "boolean") {
      throw new BadRequestException("watched must be a boolean");
    }
    const item = await this.mediaService.findOne(account, id);
    return this.mediaCatalogService.setEpisodeWatched(
      account,
      item,
      episodeId,
      body.watched
    );
  }

  @Patch(":id/seasons/:seasonNumber")
  @ApiOperation({ summary: "Mark every episode in a season watched or unwatched" })
  async setSeasonWatched(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("seasonNumber", ParseIntPipe) seasonNumber: number,
    @Body() body: { watched: boolean }
  ) {
    if (typeof body?.watched !== "boolean") {
      throw new BadRequestException("watched must be a boolean");
    }
    const item = await this.mediaService.findOne(account, id);
    return this.mediaCatalogService.setSeasonWatched(
      account,
      item,
      seasonNumber,
      body.watched
    );
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

  // ========== MATCH (override from external DB) ==========

  @Patch(":id/match")
  @ApiOperation({
    summary: "Override item with data from an external search result",
    description:
      "Applies type, cover, metadata, externalIds, and tags from a search result to an existing item.",
  })
  async matchItem(
    @ReqUser() account: Account,
    @Param("id", ParseUUIDPipe) id: string,
    @Body()
    body: {
      type: MediaType;
      coverUrl?: string;
      metadata?: Record<string, any>;
      externalIds?: Record<string, any>;
    }
  ) {
    const item = await this.mediaService.findOne(account, id);

    const merged = {
      type: body.type,
      coverUrl: body.coverUrl || item.coverUrl,
      metadata: withMediaClassifications(body.type, {
        ...item.metadata,
        ...(body.metadata || {}),
        reclassified: true,
        manualMatch: true,
      }),
      externalIds: {
        ...item.externalIds,
        ...(body.externalIds || {}),
      },
    };

    return this.mediaService.update(account, id, merged);
  }

  // ========== RE-CLASSIFY ==========

  @Post("reclassify")
  @ApiOperation({
    summary:
      "Reset classification on all items so enrichment re-processes them",
    description:
      "Clears reclassified flag and resets wrongly-classified items back to their original type.",
  })
  async reclassify(@ReqUser() account: Account) {
    return this.mediaService.resetClassification(account);
  }
}
