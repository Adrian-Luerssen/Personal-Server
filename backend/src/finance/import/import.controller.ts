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
import { CashewImportService } from "./cashew-import.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { Response } from "express";

@ApiTags("Finance - Import")
@ApiBearerAuth("access-token")
@Controller("finance/import")
export class FinanceImportController {
  constructor(private readonly importService: CashewImportService) {}

  @Post("cashew/preview")
  @ApiOperation({
    summary: "Preview Cashew import",
    description:
      "Analyzes a Cashew SQLite backup file and returns counts of what will be imported vs. already exists.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewCashew(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.importService.previewImport(account, file);
  }

  @Get("cashew/execute/:previewId")
  @ApiOperation({
    summary: "Execute Cashew import with progress streaming",
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
  async executeCashewSSE(
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

  @Post("cashew/execute")
  @ApiOperation({
    summary: "Execute Cashew import (legacy JSON)",
    description:
      "Executes a previously previewed import. Returns JSON. Use GET with SSE for progress.",
  })
  async executeCashew(
    @ReqUser() account: Account,
    @Body() body: { previewId: string }
  ) {
    if (!body.previewId) {
      throw new BadRequestException("previewId is required");
    }
    return this.importService.executeImportDirect(account, body.previewId);
  }

  @Post("cashew")
  @ApiOperation({
    summary: "Direct Cashew import (no preview)",
    description: "Import a Cashew backup directly without preview step.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async importCashew(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.importService.importFromFile(account, file);
  }
}
