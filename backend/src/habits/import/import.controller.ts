import {
  Controller,
  Post,
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
import { HabitShareImportService } from "./habitshare-import.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Habits Import")
@ApiBearerAuth("access-token")
@Controller("habits/import")
export class HabitShareImportController {
  constructor(private readonly importService: HabitShareImportService) {}

  @Post("habitshare/preview")
  @ApiOperation({
    summary: "Preview HabitShare CSV import",
    description:
      "Analyzes a HabitShare CSV export without modifying the database. Returns counts of what will be created vs skipped.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiResponse({ status: 200, description: "Preview analysis completed" })
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

  @Post("habitshare/execute")
  @ApiOperation({
    summary: "Execute HabitShare CSV import",
    description:
      "Imports a HabitShare CSV export. Creates habits and entries. Existing entries are updated if status/comment changed.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiResponse({ status: 201, description: "Import completed successfully" })
  @UseInterceptors(FileInterceptor("file"))
  async executeHabitShare(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.importService.executeImport(account, file);
  }
}
