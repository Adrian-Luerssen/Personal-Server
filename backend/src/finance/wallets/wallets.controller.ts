import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { WalletsService } from "./wallets.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Finance - Wallets")
@ApiBearerAuth("access-token")
@Controller("finance/wallets")
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @Get()
  @ApiOperation({ summary: "Get all wallets" })
  getAll(@ReqUser() account: Account) {
    return this.service.findAll(account);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get wallet by ID" })
  getOne(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.findOne(account, id);
  }

  @Post()
  @ApiOperation({ summary: "Create wallet" })
  create(@ReqUser() account: Account, @Body() body: any) {
    return this.service.create(account, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update wallet" })
  update(@ReqUser() account: Account, @Param("id") id: string, @Body() body: any) {
    return this.service.update(account, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete wallet" })
  remove(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.remove(account, id);
  }
}
