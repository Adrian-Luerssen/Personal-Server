import { Controller, Param, Patch, Get, Query } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";

import { Account } from "./account.entity";
import { AccountsService } from "./accounts.service";
import { CrudEntity } from "../common/CrudEntity.decorator";
import { ApiBearerAuth } from "@nestjs/swagger";

@CrudEntity({
  model: {
    type: Account,
  },
})
@ApiBearerAuth("access-token")
@Controller("accounts")
export class AccountsController implements CrudController<Account> {
  constructor(public service: AccountsService) {}

  @Get(":accountId")
  async getAccountInfo(@Param("accountId") accountId: string) {
    return this.service.getAccountInfo(accountId);
  }
}
