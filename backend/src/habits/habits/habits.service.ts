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
  habitIconName: string;
  habitColor: string;
  frequencyType: string;
  frequencyTarget: number;
  trackingType: string;
  numericUnit: string | null;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  lastSuccess: string | null;
}

export interface CalendarResponse {
  habits: Record<
    string,
    {
      name: string;
      iconName: string;
      color: string;
      frequencyType: string;
      trackingType: string;
    }
  >;
  entries: {
    habitId: string;
    date: string;
    status: HabitStatus;
    numericValue: number | null;
    comment: string | null;
  }[];
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
      iconName?: string;
      color?: string;
      isActive?: boolean;
      trackingType?: string;
      frequencyType?: string;
      frequencyTarget?: number;
      numericPassThreshold?: number;
      numericSkipThreshold?: number;
      numericUnit?: string;
    }
  ): Promise<Habit> {
    const habit = this.habitRepo.create({
      ...dto,
      accountId: account.id,
      account,
      isActive: dto.isActive ?? true,
      iconName: dto.iconName ?? "circle-check",
      trackingType: dto.trackingType ?? "boolean",
      frequencyType: dto.frequencyType ?? "daily",
      frequencyTarget: dto.frequencyTarget ?? 1,
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
      iconName: string;
      color: string;
      isActive: boolean;
      trackingType: string;
      frequencyType: string;
      frequencyTarget: number;
      numericPassThreshold: number;
      numericSkipThreshold: number;
      numericUnit: string;
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

  async getStreak(account: Account, habitId: string): Promise<HabitStreak> {
    await this.findOne(account, habitId);

    const entries = await this.entryRepo.find({
      where: { habitId, accountId: account.id },
      order: { date: "DESC" },
    });

    return this.calculateStreak(entries);
  }

  private calculateStreak(entries: HabitEntry[]): HabitStreak {
    if (entries.length === 0) {
      return { current: 0, longest: 0, lastSuccess: null };
    }

    const today = new Date().toISOString().slice(0, 10);

    const dateMap = new Map<string, HabitStatus>();
    let lastSuccess: string | null = null;

    for (const entry of entries) {
      dateMap.set(entry.date, entry.status);
      if (!lastSuccess && entry.status === "success") {
        lastSuccess = entry.date;
      }
    }

    // -- Current streak --
    let currentStreak = 0;
    let checkDate = new Date(today);

    if (!dateMap.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const status = dateMap.get(dateStr);

      if (!status) break;
      if (status === "success") {
        currentStreak++;
      } else if (status === "fail") {
        break;
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    // -- Longest streak --
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
    const denominator = success + fail;
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

    const allEntries = await this.entryRepo.find({
      where: { accountId: account.id },
      order: { date: "DESC" },
    });

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
        habitIconName: habit.iconName || "circle-check",
        habitColor: habit.color || "#a78bfa",
        frequencyType: habit.frequencyType || "daily",
        frequencyTarget: habit.frequencyTarget || 1,
        trackingType: habit.trackingType || "boolean",
        numericUnit: habit.numericUnit || null,
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
    month: string
  ): Promise<CalendarResponse> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException(
        "Invalid month format. Use YYYY-MM (e.g. 2024-01)"
      );
    }

    const from = `${month}-01`;
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;

    // Get all active habits
    const allHabits = await this.habitRepo.find({
      where: { accountId: account.id },
    });

    // Build habits metadata map
    const habits: CalendarResponse["habits"] = {};
    for (const h of allHabits) {
      habits[h.id] = {
        name: h.name,
        iconName: h.iconName || "circle-check",
        color: h.color || "#a78bfa",
        frequencyType: h.frequencyType || "daily",
        trackingType: h.trackingType || "boolean",
      };
    }

    // Get entries for the month
    const rawEntries = await this.entryRepo
      .createQueryBuilder("e")
      .where("e.accountId = :accountId", { accountId: account.id })
      .andWhere("e.date >= :from", { from })
      .andWhere("e.date <= :to", { to })
      .orderBy("e.date", "ASC")
      .getMany();

    const entries = rawEntries.map((e) => ({
      habitId: e.habitId,
      date: e.date,
      status: e.status,
      numericValue: e.numericValue != null ? Number(e.numericValue) : null,
      comment: e.comment || null,
    }));

    return { habits, entries };
  }

  // ========== HEATMAP (365-day view) ==========

  async getHeatmap(account: Account): Promise<{ date: string; count: number; total: number }[]> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const from = oneYearAgo.toISOString().slice(0, 10);

    const rows = await this.entryRepo
      .createQueryBuilder("e")
      .select("e.date", "date")
      .addSelect("SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END)", "count")
      .addSelect("COUNT(*)", "total")
      .where("e.accountId = :accountId", { accountId: account.id })
      .andWhere("e.date >= :from", { from })
      .groupBy("e.date")
      .orderBy("e.date", "ASC")
      .getRawMany();

    return rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count) || 0,
      total: parseInt(r.total) || 0,
    }));
  }

  // ========== FREQUENCY PROGRESS ==========

  async getProgress(
    account: Account,
    month: string
  ): Promise<{
    weekly: Record<string, any[]>;
    monthly: any[];
    yearly: any[];
  }> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException("Invalid month format. Use YYYY-MM");
    }

    const [year, mon] = month.split("-").map(Number);
    const habits = await this.habitRepo.find({
      where: { accountId: account.id, isActive: true },
    });

    const weeklyHabits = habits.filter((h) => h.frequencyType === "weekly");
    const monthlyHabits = habits.filter((h) => h.frequencyType === "monthly");
    const yearlyHabits = habits.filter((h) => h.frequencyType === "yearly");

    // Get all entries for relevant date ranges
    const monthStart = `${month}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

    const allEntries = await this.entryRepo.find({
      where: { accountId: account.id },
      order: { date: "ASC" },
    });

    // === WEEKLY ===
    const weekly: Record<string, any[]> = {};
    if (weeklyHabits.length > 0) {
      // Find all week start dates (Mondays) that overlap with this month
      const firstDate = new Date(year, mon - 1, 1);
      const lastDate = new Date(year, mon - 1, lastDay);

      // Find the Monday of the week containing the 1st
      const startMonday = new Date(firstDate);
      const dayOfWeek = startMonday.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startMonday.setDate(startMonday.getDate() + diff);

      const today = new Date().toISOString().slice(0, 10);

      for (
        let monday = new Date(startMonday);
        monday <= lastDate;
        monday.setDate(monday.getDate() + 7)
      ) {
        const weekStart = monday.toISOString().slice(0, 10);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        const weekEnd = sunday.toISOString().slice(0, 10);
        const weekPassed = weekEnd < today;

        const weekEntries = allEntries.filter(
          (e) => e.date >= weekStart && e.date <= weekEnd
        );

        weekly[weekStart] = weeklyHabits.map((h) => {
          const completed = weekEntries.filter(
            (e) => e.habitId === h.id && e.status === "success"
          ).length;
          return {
            habitId: h.id,
            habitName: h.name,
            habitIconName: h.iconName || "circle-check",
            habitColor: h.color || "#a78bfa",
            target: h.frequencyTarget,
            completed,
            passed: weekPassed
              ? completed >= h.frequencyTarget
              : completed >= h.frequencyTarget,
          };
        });
      }
    }

    // === MONTHLY ===
    const monthEntries = allEntries.filter(
      (e) => e.date >= monthStart && e.date <= monthEnd
    );
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthPassed = monthEnd < todayStr;

    const monthly = monthlyHabits.map((h) => {
      const completed = monthEntries.filter(
        (e) => e.habitId === h.id && e.status === "success"
      ).length;
      return {
        habitId: h.id,
        habitName: h.name,
        habitIconName: h.iconName || "circle-check",
        habitColor: h.color || "#a78bfa",
        target: h.frequencyTarget,
        completed,
        passed: monthPassed
          ? completed >= h.frequencyTarget
          : completed >= h.frequencyTarget,
      };
    });

    // === YEARLY ===
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const yearEntries = allEntries.filter(
      (e) => e.date >= yearStart && e.date <= yearEnd
    );

    const yearly = yearlyHabits.map((h) => {
      const completed = yearEntries.filter(
        (e) => e.habitId === h.id && e.status === "success"
      ).length;
      return {
        habitId: h.id,
        habitName: h.name,
        habitIconName: h.iconName || "circle-check",
        habitColor: h.color || "#a78bfa",
        target: h.frequencyTarget,
        completed,
      };
    });

    return { weekly, monthly, yearly };
  }
}
