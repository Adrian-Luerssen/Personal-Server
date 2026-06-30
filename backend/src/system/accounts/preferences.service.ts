import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountPreferences } from "./account-preferences.entity";

const UPDATE_FIELDS: (keyof AccountPreferences)[] = [
  "accentColor",
  "themeMode",
  "background",
  "sidebarPosition",
  "density",
  "customCss",
  "dashboardWidgets",
  "featureModules",
  "homeLayout",
  "widgetLayout",
];

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(AccountPreferences)
    private readonly repo: Repository<AccountPreferences>
  ) {}

  async getOrCreate(accountId: string): Promise<AccountPreferences> {
    let prefs = await this.repo.findOne({ where: { accountId } });
    if (!prefs) {
      prefs = this.repo.create({ accountId });
      prefs = await this.repo.save(prefs);
    }
    return prefs;
  }

  async update(accountId: string, data: Partial<AccountPreferences>): Promise<AccountPreferences> {
    const prefs = await this.getOrCreate(accountId);
    for (const field of UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        (prefs as any)[field] = data[field];
      }
    }
    return this.repo.save(prefs);
  }
}
