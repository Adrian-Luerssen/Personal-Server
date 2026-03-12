import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { BudgetsService } from "./budgets.service";

@ApiBearerAuth("access-token")
@Controller("finance/budgets")
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  findAll(@ReqUser() account: Account) {
    return this.service.findAll(account);
  }

  @Get("status")
  getStatus(@ReqUser() account: Account) {
    return this.service.getStatus(account);
  }

  @Post()
  create(
    @ReqUser() account: Account,
    @Body() dto: { amount: number; period?: string; categoryId?: string },
  ) {
    return this.service.create(account, dto);
  }

  @Patch(":id")
  update(
    @ReqUser() account: Account,
    @Param("id") id: string,
    @Body() dto: { amount?: number; period?: string; categoryId?: string },
  ) {
    return this.service.update(account, id, dto);
  }

  @Delete(":id")
  remove(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.remove(account, id);
  }
}
