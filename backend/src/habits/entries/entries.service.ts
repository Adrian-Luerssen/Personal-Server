import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Habit } from "../entities/habit.entity";
import { Account } from "../../system/accounts/account.entity";

@Injectable()
export class EntriesService {
  constructor(
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>,
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>
  ) {}

  private async verifyHabit(
    account: Account,
    habitId: string
  ): Promise<Habit> {
    const habit = await this.habitRepo.findOne({
      where: { accountId: account.id, id: habitId },
    });
    if (!habit) throw new NotFoundException(`Habit ${habitId} not found`);
    return habit;
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
    dto: { date: string; status: HabitStatus; comment?: string }
  ): Promise<HabitEntry> {
    const habit = await this.verifyHabit(account, habitId);

    // Check for conflict
    const existing = await this.entryRepo.findOne({
      where: { habitId, date: dto.date, accountId: account.id },
    });
    if (existing) {
      throw new ConflictException(
        `Entry for habit ${habitId} on date ${dto.date} already exists. Use PATCH to update.`
      );
    }

    const entry = this.entryRepo.create({
      habitId,
      habit,
      accountId: account.id,
      account,
      date: dto.date,
      status: dto.status,
      comment: dto.comment,
    });
    return this.entryRepo.save(entry);
  }

  async updateEntry(
    account: Account,
    habitId: string,
    date: string,
    dto: { status?: HabitStatus; comment?: string }
  ): Promise<HabitEntry> {
    await this.verifyHabit(account, habitId);

    const entry = await this.entryRepo.findOne({
      where: { habitId, date, accountId: account.id },
    });
    if (!entry)
      throw new NotFoundException(
        `Entry for habit ${habitId} on date ${date} not found`
      );

    if (dto.status !== undefined) entry.status = dto.status;
    if (dto.comment !== undefined) entry.comment = dto.comment;

    return this.entryRepo.save(entry);
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
  }

  /**
   * Upsert: create or update an entry. Used by import service.
   */
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

    return this.entryRepo.save(entry);
  }
}
