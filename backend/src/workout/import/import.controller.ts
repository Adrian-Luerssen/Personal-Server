import {
  Controller,
  Post,
  Get,
  Param,
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
import { FitNotesImportService } from "./fitnotes-import.service";
import { ReqUser } from "src/system/auth/auth.decorator";
import { Account } from "src/system/accounts/account.entity";
import { Response } from "express";
import { FitNotesPreviewResponse } from "./fitnotes-import.dto";

@ApiTags("Workout Import")
@ApiBearerAuth("access-token")
@Controller("workout/import")
export class WorkoutImportController {
  constructor(private readonly importService: FitNotesImportService) {}

  @Post("fitnotes/preview")
  @ApiOperation({
    summary: "Preview FitNotes import",
    description:
      "Analyzes a FitNotes backup file without modifying the database. Returns counts of what will be created vs skipped, plus warnings.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Preview analysis completed",
    type: FitNotesPreviewResponse,
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewFitNotes(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ): Promise<FitNotesPreviewResponse> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return await this.importService.previewImport(account, file);
  }

  @Get("fitnotes/execute/:previewId")
  @ApiOperation({
    summary: "Execute FitNotes import with progress streaming",
    description:
      "Executes a previously previewed import. Returns Server-Sent Events (SSE) with progress updates. The import is wrapped in a transaction - if any error occurs, all changes are rolled back.",
  })
  @ApiParam({
    name: "previewId",
    description: "Preview ID returned from the preview endpoint",
  })
  @ApiResponse({
    status: 200,
    description: "SSE stream of progress events",
  })
  async executeFitNotes(
    @ReqUser() account: Account,
    @Param("previewId") previewId: string,
    @Res() res: Response
  ): Promise<void> {
    if (!previewId) {
      res.status(400).json({ error: "Preview ID required" });
      return;
    }
    await this.importService.executeImport(account, previewId, res);
  }

  @Post("fitnotes")
  @ApiOperation({
    summary: "Import FitNotes backup (legacy)",
    description:
      "Direct import without preview. For backwards compatibility. Use preview + execute for better UX.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async importFitNotes(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      return { status: "no-file" };
    }
    return await this.importService.importFromSqlite(account, file);
  }
}
