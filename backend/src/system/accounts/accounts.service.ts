import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Account } from "./account.entity";
import { CrudRequest, GetManyDefaultResponse } from "@nestjsx/crud";
import { MoreThanOrEqual, Repository } from "typeorm";
import { addQueryFilters } from "../../utils/utils";

@Injectable()
export class AccountsService extends TypeOrmCrudService<Account> {
  constructor(@InjectRepository(Account) repo) {
    super(repo);
  }

  async getAccountInfo(accountId: string) {
    let account: Account | null = await this.repo
      .createQueryBuilder("account")
      .where("account.id = :accountId", { accountId })
      .getOne();

    return account;
  }

  public async changePassword(
    account: Account,
    credentials: string
  ): Promise<Account> {
    account.password = credentials;
    await this.repo.save(account);
    return account;
  }

  public async findAccountByEmail(email: string): Promise<Account | undefined> {
    return await this.repo.findOne({
      where: { email },
    });
  }

  public async createAccount(accountData: Partial<Account>): Promise<Account> {
    const account = this.repo.create(accountData);
    return await this.repo.save(account);
  }
}
