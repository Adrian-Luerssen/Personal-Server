import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinanceBudget } from "../entities/budget.entity";
import { FinanceTransaction } from "../entities/transaction.entity";
import { Account } from "../../system/accounts/account.entity";

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(FinanceBudget)
    private readonly repo: Repository<FinanceBudget>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
  ) {}

  async findAll(account: Account) {
    return this.repo.find({
      where: { accountId: account.id },
      relations: ["category"],
      order: { createdAt: "ASC" },
    });
  }

  async create(account: Account, dto: { amount: number; period?: string; categoryId?: string }) {
    const budget = this.repo.create({
      ...dto,
      accountId: account.id,
      account,
    });
    return this.repo.save(budget);
  }

  async update(account: Account, id: string, dto: Partial<{ amount: number; period: string; categoryId: string }>) {
    const budget = await this.repo.findOne({ where: { id, accountId: account.id } });
    if (!budget) throw new NotFoundException("Budget not found");
    Object.assign(budget, dto);
    return this.repo.save(budget);
  }

  async remove(account: Account, id: string) {
    const budget = await this.repo.findOne({ where: { id, accountId: account.id } });
    if (!budget) throw new NotFoundException("Budget not found");
    await this.repo.remove(budget);
    return { success: true };
  }

  /**
   * Get budget status: how much spent vs budget for current period
   */
  async getStatus(account: Account) {
    const budgets = await this.repo.find({
      where: { accountId: account.id },
      relations: ["category"],
    });

    const now = new Date();
    const results = await Promise.all(
      budgets.map(async (budget) => {
        const { from, to } = this.getPeriodRange(budget.period, now);

        const qb = this.txRepo
          .createQueryBuilder("t")
          .select("COALESCE(SUM(t.amount), 0)", "spent")
          .where("t.accountId = :aid", { aid: account.id })
          .andWhere("t.isIncome = false")
          .andWhere("t.transactionDate >= :from", { from })
          .andWhere("t.transactionDate <= :to", { to })
          .andWhere("(t.type IS NULL OR t.type NOT IN (1, 3))");

        if (budget.categoryId) {
          qb.andWhere(
            "(t.categoryId = :catId OR t.categoryId IN " +
            "(SELECT id FROM finance_categories WHERE \"parentCategoryId\" = :catId))",
            { catId: budget.categoryId }
          );
        }

        const result = await qb.getRawOne();
        const spent = parseFloat(result?.spent) || 0;
        const percentage = budget.amount > 0 ? Math.round((spent / Number(budget.amount)) * 100) : 0;

        return {
          id: budget.id,
          amount: Number(budget.amount),
          period: budget.period,
          categoryId: budget.categoryId,
          categoryName: budget.category?.name || "Total",
          categoryColour: budget.category?.colour,
          categoryIcon: budget.category?.iconName,
          spent,
          remaining: Number(budget.amount) - spent,
          percentage,
          isOver: spent > Number(budget.amount),
        };
      })
    );

    return results;
  }

  private getPeriodRange(period: string, now: Date) {
    if (period === "weekly") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const from = new Date(now.getFullYear(), now.getMonth(), diff);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    // Default: monthly
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
}
