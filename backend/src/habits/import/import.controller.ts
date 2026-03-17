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
import { HabitShareImportService } from "./habitshare-import.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { Response } from "express";

@ApiTags("Habits Import")
@ApiBearerAuth("access-token")
@Controller("habits/import")
export class HabitShareImportController {
  constructor(private readonly importService: HabitShareImportService) {}

  @Post("habitshare/preview")
  @ApiOperation({
    summary: "Preview HabitShare CSV import",
    description:
      "Analyzes a HabitShare CSV export without modifying the database. Returns a previewId and counts of what will be created vs skipped.",
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
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewHabitShare(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.importService.previewImport(account, file);
  }

  @Get("habitshare/execute/:previewId")
  @ApiOperation({
    summary: "Execute HabitShare CSV import with progress streaming",
    description:
      "Executes a previously previewed import. Returns Server-Sent Events (SSE) with progress updates.",
  })
  @ApiParam({
    name: "previewId",
    description: "Preview ID returned from the preview endpoint",
  })
  @ApiResponse({
    status: 200,
    description: "SSE stream of progress events",
  })
  async executeHabitShareSSE(
    @ReqUser() account: Account,
    @Param("previewId") previewId: string,
    @Res() res: Response
  ): Promise<void> {
    if (!previewId) {
      res.status(400).json({ error: "Preview ID required" });
      return;
    }
    await this.importService.executeImportSSE(account, previewId, res);
  }

  @Post("habitshare/execute")
  @ApiOperation({
    summary: "Execute HabitShare CSV import (legacy JSON)",
    description:
      "Executes a previously previewed import. Returns JSON response. Use GET with SSE for progress updates.",
  })
  @ApiResponse({
    status: 201,
    description: "Import completed successfully",
  })
  async executeHabitShare(
    @ReqUser() account: Account,
    @Body() body: { previewId: string }
  ) {
    if (!body.previewId) {
      throw new BadRequestException("previewId is required");
    }
    return this.importService.executeImport(account, body.previewId);
  }
}
