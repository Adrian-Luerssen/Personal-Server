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
  ApiTags,
} from "@nestjs/swagger";
import { CashewImportService } from "./cashew-import.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

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

  @Post("cashew/execute")
  @ApiOperation({
    summary: "Execute Cashew import",
    description:
      "Executes a previously previewed import using the previewId returned from the preview endpoint.",
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
