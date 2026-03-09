import { Account } from "./account.entity";
import { AccountPreferences } from "./account-preferences.entity";
import { AccountsController } from "./accounts.controller";
import { PreferencesController } from "./preferences.controller";
import { AccountsService } from "./accounts.service";
import { PreferencesService } from "./preferences.service";

export const AccountsModules = {
  AccountEntities: [Account, AccountPreferences],
  AccountControllers: [AccountsController, PreferencesController],
  AccountServices: [AccountsService, PreferencesService],
};
