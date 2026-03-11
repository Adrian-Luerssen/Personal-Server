import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, SelectQueryBuilder } from "typeorm";
import { FinanceTransaction } from "../entities/transaction.entity";
import { Account } from "../../system/accounts/account.entity";
import { Cache } from "cache-manager";

export interface TransactionFilters {
  walletId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  isIncome?: boolean;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly repo: Repository<FinanceTransaction>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<FinanceTransaction>,
    accountId: string,
    filters: TransactionFilters
  ) {
    qb.where("t.accountId = :accountId", { accountId });

    if (filters.walletId) {
      qb.andWhere("t.walletId = :walletId", { walletId: filters.walletId });
    }
    if (filters.categoryId) {
      qb.andWhere(
        "(t.categoryId = :categoryId OR t.categoryId IN " +
        "(SELECT id FROM app_finance_categories WHERE \"parentCategoryId\" = :categoryId))",
        { categoryId: filters.categoryId }
      );
    }
    if (filters.from) {
      qb.andWhere("t.transactionDate >= :from", { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere("t.transactionDate <= :to", { to: new Date(filters.to) });
    }
    if (filters.isIncome !== undefined) {
      qb.andWhere("t.isIncome = :isIncome", { isIncome: filters.isIncome });
    }
    if (filters.minAmount !== undefined) {
      qb.andWhere("t.amount >= :minAmount", { minAmount: filters.minAmount });
    }
    if (filters.maxAmount !== undefined) {
      qb.andWhere("t.amount <= :maxAmount", { maxAmount: filters.maxAmount });
    }
    if (filters.search) {
      qb.andWhere("LOWER(t.name) LIKE :search", {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }
    return qb;
  }

  async findAll(account: Account, filters: TransactionFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const offset = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.category", "category")
      .leftJoin("category.parentCategory", "parentCategory")
      .leftJoinAndSelect("t.wallet", "wallet")
      .select([
        't.id', 't.name', 't.amount', 't.isIncome', 't.type',
        't.transactionDate', 't.note', 't.createdAt',
        't.linkedTransferId', 't.subscriptionId',
        'category.id', 'category.name', 'category.colour', 'category.iconName',
        'category.parentCategoryId',
        'parentCategory.id', 'parentCategory.name', 'parentCategory.colour', 'parentCategory.iconName',
        'wallet.id', 'wallet.name', 'wallet.colour', 'wallet.iconName',
      ]);

    this.applyFilters(qb, account.id, filters);

    qb.orderBy("t.transactionDate", "DESC").addOrderBy("t.createdAt", "DESC");
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(account: Account, id: string) {
    const tx = await this.repo.findOne({
      where: { id, accountId: account.id },
      relations: ["category", "wallet"],
    });
    if (!tx) throw new NotFoundException("Transaction not found");
    return tx;
  }

  async create(account: Account, dto: Partial<FinanceTransaction>) {
    const tx = this.repo.create({
      ...dto,
      accountId: account.id,
      account,
    });
    const result = await this.repo.save(tx);
    await this.cacheManager.reset();
    return result;
  }

  async update(account: Account, id: string, dto: Partial<FinanceTransaction>) {
    const tx = await this.findOne(account, id);
    Object.assign(tx, dto);
    const result = await this.repo.save(tx);
    await this.cacheManager.reset();
    return result;
  }

  async remove(account: Account, id: string) {
    const tx = await this.findOne(account, id);
    if (tx.linkedTransferId) {
      const linked = await this.repo.findOne({
        where: { id: tx.linkedTransferId, accountId: account.id },
      });
      if (linked) {
        await this.repo.remove(linked);
      }
    }
    await this.repo.remove(tx);
    await this.cacheManager.reset();
    return { success: true };
  }

  async getSummary(account: Account, filters: TransactionFilters = {}) {
    const qb = this.repo.createQueryBuilder("t");
    this.applyFilters(qb, account.id, filters);
    qb.andWhere("(t.type IS NULL OR t.type NOT IN (1, 3))");

    const result = await qb
      .select("t.isIncome", "isIncome")
      .addSelect("SUM(t.amount)", "total")
      .addSelect("COUNT(t.id)", "count")
      .groupBy("t.isIncome")
      .getRawMany<{ isIncome: boolean; total: string; count: string }>();

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const row of result) {
      if (row.isIncome) {
        totalIncome = parseFloat(row.total) || 0;
        incomeCount = parseInt(row.count) || 0;
      } else {
        totalExpense = parseFloat(row.total) || 0;
        expenseCount = parseInt(row.count) || 0;
      }
    }

    // Category breakdown — group subcategories under their parent
    const categoryQb = this.repo.createQueryBuilder("t");
    this.applyFilters(categoryQb, account.id, { ...filters, isIncome: false });
    const categoryBreakdown = await categoryQb
      .leftJoin("t.category", "cat")
      .leftJoin("cat.parentCategory", "parent")
      .select("COALESCE(\"parent\".\"id\", \"cat\".\"id\")", "categoryId")
      .addSelect("COALESCE(\"parent\".\"name\", \"cat\".\"name\")", "categoryName")
      .addSelect("COALESCE(\"parent\".\"colour\", \"cat\".\"colour\")", "categoryColour")
      .addSelect("COALESCE(\"parent\".\"iconName\", \"cat\".\"iconName\")", "categoryIcon")
      .addSelect("SUM(t.amount)", "total")
      .addSelect("COUNT(t.id)", "count")
      .groupBy("COALESCE(\"parent\".\"id\", \"cat\".\"id\")")
      .addGroupBy("COALESCE(\"parent\".\"name\", \"cat\".\"name\")")
      .addGroupBy("COALESCE(\"parent\".\"colour\", \"cat\".\"colour\")")
      .addGroupBy("COALESCE(\"parent\".\"iconName\", \"cat\".\"iconName\")")
      .orderBy("SUM(t.amount)", "DESC")
      .limit(10)
      .getRawMany();

    // Daily expense totals for sparkline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyQb = this.repo.createQueryBuilder("t");
    this.applyFilters(dailyQb, account.id, {
      from: sevenDaysAgo.toISOString().slice(0, 10),
    });
    dailyQb.andWhere("t.isIncome = false");
    const dailyRows = await dailyQb
      .select("DATE(t.transactionDate)", "date")
      .addSelect("COALESCE(SUM(t.amount), 0)", "total")
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();
    const dailyTotals = dailyRows.map((r) => parseFloat(r.total) || 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      incomeCount,
      expenseCount,
      dailyTotals,
      topExpenseCategories: categoryBreakdown.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName || "Uncategorized",
        categoryColour: r.categoryColour,
        categoryIcon: r.categoryIcon,
        total: parseFloat(r.total) || 0,
        count: parseInt(r.count) || 0,
      })),
    };
  }

  async createTransfer(
    account: Account,
    body: {
      name: string;
      amountSent: number;
      amountReceived: number;
      fromWalletId: string;
      toWalletId: string;
      transactionDate: Date;
      note?: string;
    }
  ) {
    if (body.fromWalletId === body.toWalletId) {
      throw new BadRequestException("Source and destination wallets must be different");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const outgoing = queryRunner.manager.create(FinanceTransaction, {
        name: body.name,
        amount: body.amountSent,
        isIncome: false,
        type: 1,
        walletId: body.fromWalletId,
        transactionDate: body.transactionDate,
        isPaid: true,
        note: body.note,
        accountId: account.id,
      });
      const savedOutgoing = await queryRunner.manager.save(outgoing);

      const incoming = queryRunner.manager.create(FinanceTransaction, {
        name: body.name,
        amount: body.amountReceived,
        isIncome: true,
        type: 1,
        walletId: body.toWalletId,
        transactionDate: body.transactionDate,
        isPaid: true,
        note: body.note,
        accountId: account.id,
        linkedTransferId: savedOutgoing.id,
      });
      const savedIncoming = await queryRunner.manager.save(incoming);

      // Update outgoing with linked ID
      savedOutgoing.linkedTransferId = savedIncoming.id;
      await queryRunner.manager.save(savedOutgoing);

      await queryRunner.commitTransaction();
      await this.cacheManager.reset();

      return { outgoing: savedOutgoing, incoming: savedIncoming };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
