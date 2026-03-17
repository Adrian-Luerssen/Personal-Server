import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { MalImportService } from "./mal-import.service";
import { TvTimeImportService } from "./tvtime-import.service";
import { GoodreadsImportService } from "./goodreads-import.service";
import { MediaService } from "../media/media.service";
import { Response } from "express";
import { MediaStatus } from "../entities/media-item.entity";

// In-memory preview store (keyed by previewId)
const previewStore = new Map<
  string,
  { accountId: string; items: any[]; expiresAt: number }
>();

@ApiTags("Media Import")
@ApiBearerAuth("access-token")
@Controller("media/import")
export class MediaImportController {
  constructor(
    private readonly malImport: MalImportService,
    private readonly tvTimeImport: TvTimeImportService,
    private readonly goodreadsImport: GoodreadsImportService,
    private readonly mediaService: MediaService
  ) {}

  // ========== MAL ANIME PREVIEW ==========

  @Post("mal/anime/preview")
  @ApiOperation({ summary: "Preview MAL anime XML export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalAnime(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "anime");
    return this.storePreview(account.id, items);
  }

  // ========== MAL MANGA PREVIEW ==========

  @Post("mal/manga/preview")
  @ApiOperation({ summary: "Preview MAL manga XML export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalManga(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "manga");
    return this.storePreview(account.id, items);
  }

  // ========== TVTIME PREVIEW ==========

  @Post("tvtime/preview")
  @ApiOperation({ summary: "Preview TVTime CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewTvTime(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.tvTimeImport.parseCsv(file.buffer);
    return this.storePreview(account.id, items);
  }

  // ========== GOODREADS PREVIEW ==========

  @Post("goodreads/preview")
  @ApiOperation({ summary: "Preview Goodreads CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewGoodreads(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.goodreadsImport.parseCsv(file.buffer);
    return this.storePreview(account.id, items);
  }

  // ========== EXECUTE with SSE ==========

  @Get("execute/:previewId")
  @ApiOperation({
    summary: "Execute media import with progress streaming",
    description:
      "Executes a previously previewed import. Returns Server-Sent Events (SSE) with progress updates.",
  })
  @ApiParam({
    name: "previewId",
    description: "Preview ID returned from any preview endpoint",
  })
  @ApiResponse({
    status: 200,
    description: "SSE stream of progress events",
  })
  async executeImportSSE(
    @ReqUser() account: Account,
    @Param("previewId") previewId: string,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const preview = previewStore.get(previewId);
    if (!preview) {
      send({ stage: "error", message: "Preview not found or expired", error: "PREVIEW_NOT_FOUND" });
      res.end();
      return;
    }
    if (preview.accountId !== account.id) {
      send({ stage: "error", message: "Unauthorized", error: "UNAUTHORIZED" });
      res.end();
      return;
    }
    if (preview.expiresAt < Date.now()) {
      previewStore.delete(previewId);
      send({ stage: "error", message: "Preview expired", error: "EXPIRED" });
      res.end();
      return;
    }

    try {
      send({ stage: "starting", progress: 0, message: "Starting media import..." });

      const items = preview.items;
      let created = 0;
      let skipped = 0;

      for (let i = 0; i < items.length; i++) {
        const dto = items[i];
        try {
          await this.mediaService.create(account, {
            title: dto.title,
            type: dto.type,
            status: dto.status ?? MediaStatus.PLANNING,
            rating: dto.rating ?? undefined,
            metadata: dto.metadata ?? {},
            externalIds: dto.externalIds ?? {},
          });
          created++;
        } catch (err) {
          // Duplicate title+type → skip, anything else → log
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("UNIQUE")) {
            skipped++;
          } else {
            skipped++;
            send({
              stage: "importing",
              progress: 5 + ((i + 1) / items.length) * 90,
              current: i + 1,
              total: items.length,
              message: `Warning: skipped "${dto.title}" — ${msg}`,
            });
          }
        }

        if ((i + 1) % 5 === 0 || i + 1 === items.length) {
          send({
            stage: "importing",
            progress: 5 + ((i + 1) / items.length) * 90,
            current: i + 1,
            total: items.length,
            message: `Importing (${i + 1}/${items.length})`,
          });
        }
      }

      previewStore.delete(previewId);

      send({
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        summary: { created, skipped },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ stage: "error", progress: 0, message: `Import failed: ${msg}`, error: msg });
    } finally {
      res.end();
    }
  }

  // ========== EXECUTE (legacy JSON) ==========

  @Post("execute")
  @ApiOperation({
    summary: "Execute a previously previewed import (legacy JSON)",
    description: "Use GET execute/:previewId for SSE progress.",
  })
  @ApiResponse({ status: 201, description: "Import completed" })
  async executeImport(
    @ReqUser() account: Account,
    @Body() body: { previewId: string }
  ) {
    if (!body.previewId) {
      throw new BadRequestException("previewId is required");
    }

    const preview = previewStore.get(body.previewId);
    if (!preview) {
      throw new BadRequestException(
        "Preview not found or expired. Please re-upload the file."
      );
    }
    if (preview.accountId !== account.id) {
      throw new BadRequestException("Preview not found");
    }
    if (preview.expiresAt < Date.now()) {
      previewStore.delete(body.previewId);
      throw new BadRequestException("Preview expired. Please re-upload the file.");
    }

    const result = await this.mediaService.bulkCreate(account, preview.items);
    previewStore.delete(body.previewId);
    return result;
  }

  // ========== HELPERS ==========

  private storePreview(accountId: string, items: any[]) {
    const previewId = `${accountId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    previewStore.set(previewId, {
      accountId,
      items,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return {
      previewId,
      count: items.length,
      items: items.slice(0, 50),
      totalItems: items.length,
    };
  }
}
