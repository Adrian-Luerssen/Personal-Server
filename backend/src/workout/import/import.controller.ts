import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ApiBearerAuth, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { FitNotesImportService } from "./fitnotes-import.service";
import { ReqUser } from "src/system/auth/auth.decorator";
import { Account } from "src/system/accounts/account.entity";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

@ApiBearerAuth("access-token")
@Controller("workout/import")
export class WorkoutImportController {
  constructor(private readonly importService: FitNotesImportService) {}

  @Post("fitnotes")
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
