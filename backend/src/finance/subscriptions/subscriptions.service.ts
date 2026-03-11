import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Not, Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FinanceSubscription } from "../entities/subscription.entity";
import { FinanceTransaction } from "../entities/transaction.entity";
import { Cache } from "cache-manager";

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(FinanceSubscription)
    private readonly repo: Repository<FinanceSubscription>,
    @InjectRepository(FinanceTransaction)
    private readonly transactionRepo: Repository<FinanceTransaction>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async findAll(accountId: string) {
    return this.repo.find({
      where: { accountId },
      relations: ["wallet", "category"],
      order: { isActive: "DESC", name: "ASC" },
    });
  }

  async findOne(accountId: string, id: string) {
    const sub = await this.repo.findOne({
      where: { id, accountId },
      relations: ["wallet", "category"],
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    return sub;
  }

  async create(accountId: string, dto: Partial<FinanceSubscription>) {
    const sub = this.repo.create({ ...dto, accountId });
    const result = await this.repo.save(sub);
    await this.cacheManager.reset();
    return this.findOne(accountId, result.id);
  }

  async update(accountId: string, id: string, dto: Partial<FinanceSubscription>) {
    const sub = await this.findOne(accountId, id);
    Object.assign(sub, dto);
    await this.repo.save(sub);
    await this.cacheManager.reset();
    return this.findOne(accountId, id);
  }

  async remove(accountId: string, id: string) {
    const sub = await this.findOne(accountId, id);
    await this.repo.remove(sub);
    await this.cacheManager.reset();
    return { success: true };
  }

  async generate(accountId: string): Promise<number> {
    const subs = await this.repo.find({
      where: { accountId, isActive: true, walletId: Not(IsNull()) },
    });

    let totalGenerated = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sub of subs) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Lock the subscription row
        await queryRunner.manager.findOne(FinanceSubscription, {
          where: { id: sub.id },
          lock: { mode: "pessimistic_write" },
        });

        const startDate = sub.lastGeneratedDate
          ? new Date(sub.lastGeneratedDate)
          : new Date(sub.createdAt);
        startDate.setHours(0, 0, 0, 0);

        const billingDates = this.calculateBillingDates(sub, startDate, today);
        let latestGenerated: Date | null = null;

        for (const billingDate of billingDates) {
          // Idempotency check
          const existing = await queryRunner.manager.findOne(FinanceTransaction, {
            where: {
              subscriptionId: sub.id,
              transactionDate: billingDate,
            },
          });

          if (existing) continue;

          const tx = queryRunner.manager.create(FinanceTransaction, {
            name: sub.name,
            amount: sub.amount,
            isIncome: sub.isIncome,
            walletId: sub.walletId!,
            categoryId: sub.categoryId,
            transactionDate: billingDate,
            isPaid: true,
            type: 0,
            subscriptionId: sub.id,
            accountId,
            note: `Auto-generated from subscription: ${sub.name}`,
          });

          await queryRunner.manager.save(tx);
          totalGenerated++;

          if (!latestGenerated || billingDate > latestGenerated) {
            latestGenerated = billingDate;
          }
        }

        if (latestGenerated) {
          await queryRunner.manager.update(FinanceSubscription, sub.id, {
            lastGeneratedDate: latestGenerated,
          });
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `Failed to generate transactions for subscription ${sub.id}: ${err}`
        );
      } finally {
        await queryRunner.release();
      }
    }

    if (totalGenerated > 0) {
      await this.cacheManager.reset();
    }

    return totalGenerated;
  }

  private calculateBillingDates(
    sub: FinanceSubscription,
    afterDate: Date,
    upToDate: Date
  ): Date[] {
    const dates: Date[] = [];

    switch (sub.frequency) {
      case "weekly": {
        // billingDay: 1=Mon...7=Sun
        const targetDow = sub.billingDay; // 1-7
        // Find the first occurrence after afterDate
        const cursor = new Date(afterDate);
        cursor.setDate(cursor.getDate() + 1); // start from day after
        // Advance to target day of week
        // JS: 0=Sun, 1=Mon...6=Sat. Convert billingDay: 1=Mon->1, 7=Sun->0
        const jsDow = sub.billingDay === 7 ? 0 : sub.billingDay;
        while (cursor.getDay() !== jsDow) {
          cursor.setDate(cursor.getDate() + 1);
        }
        while (cursor <= upToDate) {
          dates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 7);
        }
        break;
      }

      case "monthly": {
        const cursor = new Date(afterDate);
        cursor.setDate(1); // go to 1st of month
        // Start from the month after afterDate's month if afterDate's day >= billingDay
        if (afterDate.getDate() >= sub.billingDay) {
          cursor.setMonth(cursor.getMonth() + 1);
        }
        // Otherwise start from afterDate's month
        while (cursor <= upToDate || this.getClampedDate(cursor, sub.billingDay) <= upToDate) {
          const billingDate = this.getClampedDate(cursor, sub.billingDay);
          if (billingDate > afterDate && billingDate <= upToDate) {
            dates.push(billingDate);
          }
          cursor.setMonth(cursor.getMonth() + 1);
          // Safety: stop if we've gone way past upToDate
          if (cursor.getFullYear() - upToDate.getFullYear() > 1) break;
        }
        break;
      }

      case "yearly": {
        const billingMonth = (sub.billingMonth ?? 1) - 1; // 0-indexed
        let year = afterDate.getFullYear();
        // Check from current year
        for (let i = 0; i < 200; i++) {
          const candidate = new Date(year, billingMonth, 1);
          const daysInMonth = new Date(year, billingMonth + 1, 0).getDate();
          const day = Math.min(sub.billingDay, daysInMonth);
          candidate.setDate(day);
          candidate.setHours(0, 0, 0, 0);

          if (candidate > afterDate && candidate <= upToDate) {
            dates.push(candidate);
          }
          if (candidate > upToDate) break;
          year++;
        }
        break;
      }
    }

    return dates;
  }

  private getClampedDate(cursorAtFirst: Date, billingDay: number): Date {
    const year = cursorAtFirst.getFullYear();
    const month = cursorAtFirst.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(billingDay, daysInMonth);
    const result = new Date(year, month, day);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleSubscriptionGeneration() {
    try {
      this.logger.log("Starting daily subscription generation...");

      const results = await this.repo
        .createQueryBuilder("s")
        .select("DISTINCT s.accountId", "accountId")
        .where("s.isActive = :isActive", { isActive: true })
        .getRawMany<{ accountId: string }>();

      const accountIds = results.map((r) => r.accountId);
      this.logger.log(`Found ${accountIds.length} accounts with active subscriptions`);

      let totalGenerated = 0;
      for (const accountId of accountIds) {
        try {
          const count = await this.generate(accountId);
          totalGenerated += count;
          if (count > 0) {
            this.logger.log(
              `Generated ${count} transactions for account ${accountId}`
            );
          }
        } catch (err) {
          this.logger.error(
            `Failed to generate subscriptions for account ${accountId}: ${err}`
          );
        }
      }

      this.logger.log(
        `Subscription generation complete. Total transactions created: ${totalGenerated}`
      );
    } catch (err) {
      this.logger.error(`Subscription generation cron failed: ${err}`);
    }
  }
}
