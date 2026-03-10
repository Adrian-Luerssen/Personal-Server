import { CACHE_MANAGER, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinanceWallet } from "../entities/wallet.entity";
import { Account } from "../../system/accounts/account.entity";
import { Cache } from "cache-manager";

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(FinanceWallet)
    private readonly repo: Repository<FinanceWallet>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async findAll(account: Account) {
    const wallets = await this.repo.find({
      where: { accountId: account.id },
      order: { order: "ASC", name: "ASC" },
    });

    // Compute balance for each wallet from transactions
    const balances = await this.repo.manager
      .createQueryBuilder()
      .select('"walletId"')
      .addSelect(`SUM(CASE WHEN "isIncome" = true THEN amount ELSE -amount END)`, 'balance')
      .from('app_finance_transactions', 't')
      .where('"accountId" = :accountId', { accountId: account.id })
      .groupBy('"walletId"')
      .getRawMany();

    const balanceMap = new Map(balances.map((b: any) => [b.walletId, parseFloat(b.balance) || 0]));

    return wallets.map(w => ({
      ...w,
      balance: balanceMap.get(w.id) || 0,
    }));
  }

  async findOne(account: Account, id: string) {
    const wallet = await this.repo.findOne({
      where: { id, accountId: account.id },
    });
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  async create(account: Account, dto: Partial<FinanceWallet>) {
    const wallet = this.repo.create({
      ...dto,
      accountId: account.id,
      account,
    });
    const result = await this.repo.save(wallet);
    await this.cacheManager.reset();
    return result;
  }

  async update(account: Account, id: string, dto: Partial<FinanceWallet>) {
    const wallet = await this.findOne(account, id);
    Object.assign(wallet, dto);
    const result = await this.repo.save(wallet);
    await this.cacheManager.reset();
    return result;
  }

  async remove(account: Account, id: string) {
    const wallet = await this.findOne(account, id);
    await this.repo.remove(wallet);
    await this.cacheManager.reset();
    return { success: true };
  }
}
