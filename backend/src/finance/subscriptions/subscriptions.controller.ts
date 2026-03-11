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
import { SubscriptionsService } from "./subscriptions.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Finance - Subscriptions")
@ApiBearerAuth("access-token")
@Controller("finance/subscriptions")
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: "Get all subscriptions" })
  getAll(@ReqUser() account: Account) {
    return this.service.findAll(account.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get subscription by ID" })
  getOne(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.findOne(account.id, id);
  }

  @Post("generate")
  @ApiOperation({ summary: "Generate pending transactions for active subscriptions" })
  generate(@ReqUser() account: Account) {
    return this.service.generate(account.id);
  }

  @Post()
  @ApiOperation({ summary: "Create subscription" })
  create(@ReqUser() account: Account, @Body() body: any) {
    return this.service.create(account.id, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update subscription" })
  update(@ReqUser() account: Account, @Param("id") id: string, @Body() body: any) {
    return this.service.update(account.id, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete subscription" })
  remove(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.remove(account.id, id);
  }
}
