import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinanceWallet } from "../entities/wallet.entity";
import { Account } from "../../system/accounts/account.entity";

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(FinanceWallet)
    private readonly repo: Repository<FinanceWallet>
  ) {}

  findAll(account: Account) {
    return this.repo.find({
      where: { accountId: account.id },
      order: { order: "ASC", name: "ASC" },
    });
  }

  async findOne(account: Account, id: string) {
    const wallet = await this.repo.findOne({
      where: { id, accountId: account.id },
    });
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  create(account: Account, dto: Partial<FinanceWallet>) {
    const wallet = this.repo.create({
      ...dto,
      accountId: account.id,
      account,
    });
    return this.repo.save(wallet);
  }

  async update(account: Account, id: string, dto: Partial<FinanceWallet>) {
    const wallet = await this.findOne(account, id);
    Object.assign(wallet, dto);
    return this.repo.save(wallet);
  }

  async remove(account: Account, id: string) {
    const wallet = await this.findOne(account, id);
    await this.repo.remove(wallet);
    return { success: true };
  }
}
