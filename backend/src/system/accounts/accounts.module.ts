import { Account } from "./account.entity";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

export const AccountsModules = {
  AccountEntities: [Account],
  AccountControllers: [AccountsController],
  AccountServices: [AccountsService],
};
