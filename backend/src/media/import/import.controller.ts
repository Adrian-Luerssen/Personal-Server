import {
  Controller,
  Post,
  Body,
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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { MalImportService } from "./mal-import.service";
import { TvTimeImportService } from "./tvtime-import.service";
import { GoodreadsImportService } from "./goodreads-import.service";
import { MediaService } from "../media/media.service";

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

  // ========== EXECUTE IMPORT ==========

  @Post("execute")
  @ApiOperation({
    summary: "Execute a previously previewed import",
    description: "Uses the previewId from any preview endpoint to create the media items.",
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
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min TTL
    });

    return {
      previewId,
      count: items.length,
      items: items.slice(0, 50), // Return first 50 for preview
      totalItems: items.length,
    };
  }
}
