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

// In-memory preview store
const previewStore = new Map<
  string,
  {
    accountId: string;
    newItems: any[];
    duplicates: any[]; // { incoming, existing }
    expiresAt: number;
    selectedDuplicateActions: Record<string, "skip" | "replace" | "keep">;
  }
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
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalAnime(@ReqUser() account: Account, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "anime");
    return this.storePreviewWithDedup(account, items);
  }

  // ========== MAL MANGA PREVIEW ==========

  @Post("mal/manga/preview")
  @ApiOperation({ summary: "Preview MAL manga XML export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalManga(@ReqUser() account: Account, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "manga");
    return this.storePreviewWithDedup(account, items);
  }

  // ========== TVTIME PREVIEW ==========

  @Post("tvtime/preview")
  @ApiOperation({ summary: "Preview TVTime CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @UseInterceptors(FileInterceptor("file"))
  async previewTvTime(@ReqUser() account: Account, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.tvTimeImport.parseCsv(file.buffer);
    return this.storePreviewWithDedup(account, items);
  }

  // ========== GOODREADS PREVIEW ==========

  @Post("goodreads/preview")
  @ApiOperation({ summary: "Preview Goodreads CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @UseInterceptors(FileInterceptor("file"))
  async previewGoodreads(@ReqUser() account: Account, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.goodreadsImport.parseCsv(file.buffer);
    return this.storePreviewWithDedup(account, items);
  }

  // ========== SET DUPLICATE ACTIONS ==========

  @Post("resolve")
  @ApiOperation({
    summary: "Set duplicate resolution actions before executing import",
    description: "Pass a map of title -> action ('skip' | 'replace') for each duplicate.",
  })
  async resolveDuplicates(
    @ReqUser() account: Account,
    @Body() body: { previewId: string; actions: Record<string, "skip" | "replace"> }
  ) {
    if (!body.previewId) throw new BadRequestException("previewId is required");
    const preview = previewStore.get(body.previewId);
    if (!preview || preview.accountId !== account.id) {
      throw new BadRequestException("Preview not found");
    }
    preview.selectedDuplicateActions = body.actions || {};
    return { ok: true };
  }

  // ========== EXECUTE with SSE ==========

  @Get("execute/:previewId")
  @ApiOperation({ summary: "Execute media import with progress streaming" })
  @ApiParam({ name: "previewId" })
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
      res.end(); return;
    }
    if (preview.accountId !== account.id) {
      send({ stage: "error", message: "Unauthorized", error: "UNAUTHORIZED" });
      res.end(); return;
    }
    if (preview.expiresAt < Date.now()) {
      previewStore.delete(previewId);
      send({ stage: "error", message: "Preview expired", error: "EXPIRED" });
      res.end(); return;
    }

    try {
      send({ stage: "starting", progress: 0, message: "Starting media import..." });

      const actions = preview.selectedDuplicateActions || {};
      let created = 0;
      let skipped = 0;
      let replaced = 0;

      // Combine new items + duplicates that should be replaced
      const toCreate = [...preview.newItems];
      const toReplace: Array<{ incoming: any; existingId: string }> = [];

      for (const dup of preview.duplicates) {
        const action = actions[dup.incoming.title] || "skip";
        if (action === "replace") {
          toReplace.push({ incoming: dup.incoming, existingId: dup.existing.id });
        } else {
          skipped++;
        }
      }

      const total = toCreate.length + toReplace.length;

      // Create new items
      for (let i = 0; i < toCreate.length; i++) {
        const dto = toCreate[i];
        try {
          await this.mediaService.create(account, {
            title: dto.title,
            type: dto.type,
            status: dto.status ?? MediaStatus.PLANNING,
            rating: dto.rating ?? undefined,
            coverUrl: dto.coverUrl ?? undefined,
            metadata: dto.metadata ?? {},
            externalIds: dto.externalIds ?? {},
          });
          created++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("UNIQUE")) {
            skipped++;
          } else {
            skipped++;
          }
        }

        if ((i + 1) % 5 === 0 || i + 1 === toCreate.length) {
          send({
            stage: "importing",
            progress: 5 + ((i + 1) / total) * 90,
            current: i + 1,
            total,
            message: `Creating new items (${i + 1}/${toCreate.length})`,
          });
        }
      }

      // Replace duplicates
      for (let i = 0; i < toReplace.length; i++) {
        const { incoming, existingId } = toReplace[i];
        try {
          await this.mediaService.update(account, existingId, {
            status: incoming.status,
            rating: incoming.rating ?? undefined,
            coverUrl: incoming.coverUrl ?? undefined,
            metadata: incoming.metadata ?? {},
            externalIds: incoming.externalIds ?? {},
          });
          replaced++;
        } catch {
          skipped++;
        }

        const idx = toCreate.length + i + 1;
        if ((i + 1) % 5 === 0 || i + 1 === toReplace.length) {
          send({
            stage: "replacing",
            progress: 5 + (idx / total) * 90,
            current: idx,
            total,
            message: `Updating duplicates (${i + 1}/${toReplace.length})`,
          });
        }
      }

      previewStore.delete(previewId);

      send({
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        summary: { created, replaced, skipped },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ stage: "error", progress: 0, message: `Import failed: ${msg}`, error: msg });
    } finally {
      res.end();
    }
  }

  // ========== HELPERS ==========

  private async storePreviewWithDedup(account: Account, items: any[]) {
    // Load all existing media for this account
    const existing = await this.mediaService.findAll(account);
    const existingMap = new Map<string, any>();
    for (const e of existing) {
      // Key by lowercase title for fuzzy matching
      existingMap.set(e.title.toLowerCase().trim(), e);
    }

    const newItems: any[] = [];
    const duplicates: Array<{ incoming: any; existing: any }> = [];

    for (const item of items) {
      const key = item.title.toLowerCase().trim();
      const match = existingMap.get(key);
      if (match) {
        duplicates.push({
          incoming: item,
          existing: {
            id: match.id,
            title: match.title,
            type: match.type,
            status: match.status,
            rating: match.rating != null ? Number(match.rating) : null,
            coverUrl: match.coverUrl,
            metadata: match.metadata,
          },
        });
      } else {
        newItems.push(item);
      }
    }

    const previewId = `${account.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    previewStore.set(previewId, {
      accountId: account.id,
      newItems,
      duplicates,
      expiresAt: Date.now() + 15 * 60 * 1000,
      selectedDuplicateActions: {},
    });

    return {
      previewId,
      newCount: newItems.length,
      duplicateCount: duplicates.length,
      totalItems: items.length,
      items: newItems.slice(0, 30),
      duplicates: duplicates.slice(0, 50),
    };
  }
}
