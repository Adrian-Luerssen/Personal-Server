import {
  Injectable,
  NotFoundException,
  ConflictException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Habit } from "../entities/habit.entity";
import { Account } from "../../system/accounts/account.entity";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";

@Injectable()
export class EntriesService {
  constructor(
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>,
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>,
    @Optional()
    private readonly syncService?: SyncService
  ) {}

  private async verifyHabit(account: Account, habitId: string): Promise<Habit> {
    const habit = await this.habitRepo.findOne({
      where: { accountId: account.id, id: habitId },
    });
    if (!habit) throw new NotFoundException(`Habit ${habitId} not found`);
    return habit;
  }

  /**
   * Auto-evaluate status from numeric value and habit thresholds.
   * Lower is better: value <= pass → success, value <= skip → skip, else fail.
   */
  private evaluateNumericStatus(habit: Habit, numericValue: number): HabitStatus {
    if (
      habit.numericPassThreshold != null &&
      numericValue <= Number(habit.numericPassThreshold)
    ) {
      return "success";
    }
    if (
      habit.numericSkipThreshold != null &&
      numericValue <= Number(habit.numericSkipThreshold)
    ) {
      return "skip";
    }
    return "fail";
  }

  async findByHabit(
    account: Account,
    habitId: string,
    from?: string,
    to?: string
  ): Promise<HabitEntry[]> {
    await this.verifyHabit(account, habitId);

    let query = this.entryRepo
      .createQueryBuilder("e")
      .where("e.habitId = :habitId", { habitId })
      .andWhere("e.accountId = :accountId", { accountId: account.id })
      .orderBy("e.date", "DESC");

    if (from) query = query.andWhere("e.date >= :from", { from });
    if (to) query = query.andWhere("e.date <= :to", { to });

    return query.getMany();
  }

  async addEntry(
    account: Account,
    habitId: string,
    dto: {
      date: string;
      status?: HabitStatus;
      numericValue?: number;
      comment?: string;
    }
  ): Promise<HabitEntry> {
    const habit = await this.verifyHabit(account, habitId);

    const existing = await this.entryRepo.findOne({
      where: { habitId, date: dto.date, accountId: account.id },
    });
    if (existing) {
      throw new ConflictException(
        `Entry for habit ${habitId} on date ${dto.date} already exists. Use PATCH to update.`
      );
    }

    // Auto-evaluate status for numeric habits
    let status = dto.status;
    if (
      habit.trackingType === "numeric" &&
      dto.numericValue != null &&
      !status
    ) {
      status = this.evaluateNumericStatus(habit, dto.numericValue);
    }
    if (!status) status = "success";

    const entry = this.entryRepo.create({
      habitId,
      habit,
      accountId: account.id,
      account,
      date: dto.date,
      status,
      numericValue: dto.numericValue ?? undefined,
      comment: dto.comment,
    });
    const saved = await this.entryRepo.save(entry);
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);
    return saved;
  }

  async updateEntry(
    account: Account,
    habitId: string,
    date: string,
    dto: {
      status?: HabitStatus;
      numericValue?: number;
      comment?: string;
    }
  ): Promise<HabitEntry> {
    const habit = await this.verifyHabit(account, habitId);

    const entry = await this.entryRepo.findOne({
      where: { habitId, date, accountId: account.id },
    });
    if (!entry)
      throw new NotFoundException(
        `Entry for habit ${habitId} on date ${date} not found`
      );

    if (dto.numericValue !== undefined) {
      entry.numericValue = dto.numericValue;
    }

    if (dto.status !== undefined) {
      entry.status = dto.status;
    } else if (
      habit.trackingType === "numeric" &&
      dto.numericValue != null
    ) {
      // Auto-evaluate if numericValue changed but status wasn't explicitly set
      entry.status = this.evaluateNumericStatus(habit, dto.numericValue);
    }

    if (dto.comment !== undefined) entry.comment = dto.comment;

    const saved = await this.entryRepo.save(entry);
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);
    return saved;
  }

  async removeEntry(
    account: Account,
    habitId: string,
    date: string
  ): Promise<void> {
    await this.verifyHabit(account, habitId);

    const entry = await this.entryRepo.findOne({
      where: { habitId, date, accountId: account.id },
    });
    if (!entry)
      throw new NotFoundException(
        `Entry for habit ${habitId} on date ${date} not found`
      );

    await this.entryRepo.remove(entry);
    await this.recordSync(account.id, entry, SyncOperation.DELETE);
  }

  async upsertEntry(
    account: Account,
    habit: Habit,
    date: string,
    status: HabitStatus,
    comment?: string
  ): Promise<HabitEntry> {
    let entry = await this.entryRepo.findOne({
      where: { habitId: habit.id, date, accountId: account.id },
    });

    if (entry) {
      entry.status = status;
      if (comment !== undefined) entry.comment = comment;
    } else {
      entry = this.entryRepo.create({
        habitId: habit.id,
        habit,
        accountId: account.id,
        account,
        date,
        status,
        comment: comment || undefined,
      });
    }

    const saved = await this.entryRepo.save(entry);
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);
    return saved;
  }

  private async recordSync(
    accountId: string,
    entry: HabitEntry,
    operation: SyncOperation
  ) {
    if (!this.syncService) return;
    await this.syncService.recordEvent(accountId, {
      entityType: "habit-entry",
      entityId: entry.id,
      operation,
      payload: operation === SyncOperation.DELETE ? null : entry,
    });
  }
}
