import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Habit } from "../entities/habit.entity";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Account } from "../../system/accounts/account.entity";
import { Cache } from "cache-manager";

export interface HabitStreak {
  current: number;
  longest: number;
  lastSuccess: string | null;
}

export interface HabitStats {
  total: number;
  success: number;
  fail: number;
  skip: number;
  successRate: number;
}

export interface HabitSummaryItem {
  habitId: string;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  lastSuccess: string | null;
}

export interface CalendarEntry {
  habitId: string;
  habitName: string;
  date: string;
  status: HabitStatus;
  comment?: string;
}

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>,
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  // ========== HABIT CRUD ==========

  async findAll(account: Account): Promise<Habit[]> {
    return this.habitRepo.find({
      where: { accountId: account.id },
      order: { name: "ASC" },
    });
  }

  async findOne(account: Account, id: string): Promise<Habit> {
    const habit = await this.habitRepo.findOne({
      where: { accountId: account.id, id },
    });
    if (!habit) throw new NotFoundException(`Habit ${id} not found`);
    return habit;
  }

  async create(
    account: Account,
    dto: {
      name: string;
      description?: string;
      emoji?: string;
      isActive?: boolean;
      color?: string;
    }
  ): Promise<Habit> {
    const habit = this.habitRepo.create({
      ...dto,
      accountId: account.id,
      account,
      isActive: dto.isActive ?? true,
    });
    const result = await this.habitRepo.save(habit);
    await this.cacheManager.reset();
    return result;
  }

  async update(
    account: Account,
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      emoji: string;
      isActive: boolean;
      color: string;
    }>
  ): Promise<Habit> {
    const habit = await this.findOne(account, id);
    Object.assign(habit, dto);
    const result = await this.habitRepo.save(habit);
    await this.cacheManager.reset();
    return result;
  }

  async remove(account: Account, id: string): Promise<void> {
    const habit = await this.findOne(account, id);
    await this.habitRepo.remove(habit);
    await this.cacheManager.reset();
  }

  // ========== STREAK CALCULATION ==========

  /**
   * Calculate current streak and longest streak for a habit.
   * Rules:
   *   - 'success' continues streak
   *   - 'skip' doesn't break streak (neutral)
   *   - 'fail' breaks streak
   * Current streak counts from today (or yesterday if today has no entry) backwards.
   */
  async getStreak(account: Account, habitId: string): Promise<HabitStreak> {
    await this.findOne(account, habitId);

    const entries = await this.entryRepo.find({
      where: { habitId, accountId: account.id },
      order: { date: "DESC" },
    });

    return this.calculateStreak(entries);
  }

  private calculateStreak(
    entries: HabitEntry[]
  ): HabitStreak {
    if (entries.length === 0) {
      return { current: 0, longest: 0, lastSuccess: null };
    }

    const today = new Date().toISOString().slice(0, 10);

    // Build a date -> status map for easier lookup
    const dateMap = new Map<string, HabitStatus>();
    let lastSuccess: string | null = null;

    for (const entry of entries) {
      dateMap.set(entry.date, entry.status);
      if (!lastSuccess && entry.status === "success") {
        lastSuccess = entry.date;
      }
    }

    // -- Current streak --
    // Start from today and walk backwards
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If today has no entry, skip to yesterday as starting point
    if (!dateMap.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const status = dateMap.get(dateStr);

      if (!status) break; // No entry for this date, streak ends

      if (status === "success") {
        currentStreak++;
      } else if (status === "fail") {
        break; // Streak broken
      }
      // skip: continue without incrementing

      checkDate.setDate(checkDate.getDate() - 1);
    }

    // -- Longest streak --
    // Sort entries by date ASC to scan forward
    const sortedEntries = [...entries].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let longestStreak = 0;
    let runningStreak = 0;

    for (const entry of sortedEntries) {
      if (entry.status === "success") {
        runningStreak++;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else if (entry.status === "fail") {
        runningStreak = 0;
      }
      // skip: continue without resetting
    }

    return { current: currentStreak, longest: longestStreak, lastSuccess };
  }

  // ========== STATS ==========

  async getStats(
    account: Account,
    habitId: string,
    period?: "week" | "month" | "year"
  ): Promise<HabitStats> {
    await this.findOne(account, habitId);

    let query = this.entryRepo
      .createQueryBuilder("e")
      .where("e.habitId = :habitId", { habitId })
      .andWhere("e.accountId = :accountId", { accountId: account.id });

    if (period) {
      const from = this.getPeriodStart(period);
      query = query.andWhere("e.date >= :from", { from });
    }

    const entries = await query.getMany();
    return this.computeStats(entries);
  }

  private getPeriodStart(period: "week" | "month" | "year"): string {
    const now = new Date();
    if (period === "week") {
      now.setDate(now.getDate() - 7);
    } else if (period === "month") {
      now.setMonth(now.getMonth() - 1);
    } else {
      now.setFullYear(now.getFullYear() - 1);
    }
    return now.toISOString().slice(0, 10);
  }

  private computeStats(entries: HabitEntry[]): HabitStats {
    let success = 0,
      fail = 0,
      skip = 0;
    for (const e of entries) {
      if (e.status === "success") success++;
      else if (e.status === "fail") fail++;
      else skip++;
    }
    const denominator = success + fail; // exclude skips from rate
    const successRate = denominator > 0 ? (success / denominator) * 100 : 0;
    return {
      total: entries.length,
      success,
      fail,
      skip,
      successRate: Math.round(successRate * 10) / 10,
    };
  }

  // ========== SUMMARY (all habits) ==========

  async getAllStreaks(account: Account): Promise<HabitSummaryItem[]> {
    const habits = await this.findAll(account);

    // Fetch all entries for all habits in a single query
    const allEntries = await this.entryRepo.find({
      where: { accountId: account.id },
      order: { date: "DESC" },
    });

    // Group entries by habitId
    const entriesByHabit = new Map<string, HabitEntry[]>();
    for (const entry of allEntries) {
      const list = entriesByHabit.get(entry.habitId) || [];
      list.push(entry);
      entriesByHabit.set(entry.habitId, list);
    }

    const results: HabitSummaryItem[] = [];
    for (const habit of habits) {
      const entries = entriesByHabit.get(habit.id) || [];
      const streak = this.calculateStreak(entries);
      const stats = this.computeStats(entries);

      results.push({
        habitId: habit.id,
        habitName: habit.name,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        successRate: stats.successRate,
        lastSuccess: streak.lastSuccess,
      });
    }

    return results;
  }

  // ========== DAILY COMPLETIONS (sparkline) ==========

  async getDailyCompletions(account: Account): Promise<number[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const from = sevenDaysAgo.toISOString().slice(0, 10);

    const rows = await this.entryRepo
      .createQueryBuilder("e")
      .select("e.date", "date")
      .addSelect("COUNT(*)", "count")
      .where("e.accountId = :accountId", { accountId: account.id })
      .andWhere("e.status = 'success'")
      .andWhere("e.date >= :from", { from })
      .groupBy("e.date")
      .orderBy("e.date", "ASC")
      .getRawMany();

    return rows.map((r) => parseInt(r.count) || 0);
  }

  // ========== CALENDAR VIEW ==========

  async getCalendar(
    account: Account,
    month: string // format: YYYY-MM
  ): Promise<CalendarEntry[]> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException(
        "Invalid month format. Use YYYY-MM (e.g. 2024-01)"
      );
    }

    const from = `${month}-01`;
    // Last day of month
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;

    const entries = await this.entryRepo
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.habit", "h")
      .where("e.accountId = :accountId", { accountId: account.id })
      .andWhere("e.date >= :from", { from })
      .andWhere("e.date <= :to", { to })
      .orderBy("e.date", "ASC")
      .addOrderBy("h.name", "ASC")
      .getMany();

    return entries.map((e) => ({
      habitId: e.habitId,
      habitName: e.habit?.name ?? "",
      date: e.date,
      status: e.status,
      comment: e.comment,
    }));
  }
}
