import { Controller, Get, Patch, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ReqUser } from "../auth/auth.decorator";
import { Account } from "./account.entity";
import { AccountPreferences } from "./account-preferences.entity";
import { PreferencesService } from "./preferences.service";

@ApiTags("Account Preferences")
@ApiBearerAuth("access-token")
@Controller("accounts/preferences")
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async get(@ReqUser() account: Account) {
    return this.preferencesService.getOrCreate(account.id);
  }

  @Patch()
  async update(@ReqUser() account: Account, @Body() body: Partial<{
    accentColor: string;
    themeMode: string;
    background: any;
    sidebarPosition: string;
    density: string;
    customCss: string;
  }>) {
    return this.preferencesService.update(account.id, body as Partial<AccountPreferences>);
  }
}
