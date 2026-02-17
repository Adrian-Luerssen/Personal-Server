import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Habit } from "../entities/habit.entity";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Account } from "../../system/accounts/account.entity";

export interface HabitShareRow {
  Habit: string;
  Date: string;
  Status: string;
  Comment?: string;
}

export interface HabitSharePreview {
  totalRecords: number;
  habits: {
    total: number;
    new: number;
    existing: number;
  };
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  warnings: string[];
}

export interface HabitShareImportResult {
  habitsCreated: number;
  entriesCreated: number;
  entriesUpdated: number;
  skipped: number;
  warnings: string[];
}

const VALID_STATUSES = new Set<string>(["success", "fail", "skip"]);

@Injectable()
export class HabitShareImportService {
  private readonly logger = new Logger(HabitShareImportService.name);

  constructor(
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>,
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>
  ) {}

  /**
   * Parse HabitShare CSV content.
   * Format: Habit,Date,Status,Comment
   * Handles quoted fields and emoji names.
   */
  private parseCsv(content: string): HabitShareRow[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const header = this.parseCsvLine(lines[0]);
    const habitIdx = header.findIndex((h) => h.toLowerCase() === "habit");
    const dateIdx = header.findIndex((h) => h.toLowerCase() === "date");
    const statusIdx = header.findIndex((h) => h.toLowerCase() === "status");
    const commentIdx = header.findIndex((h) => h.toLowerCase() === "comment");

    if (habitIdx < 0 || dateIdx < 0 || statusIdx < 0) {
      throw new Error(
        "Invalid CSV: missing required columns (Habit, Date, Status)"
      );
    }

    const rows: HabitShareRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = this.parseCsvLine(lines[i]);
      const habit = fields[habitIdx]?.trim() ?? "";
      const date = fields[dateIdx]?.trim() ?? "";
      const status = fields[statusIdx]?.trim().toLowerCase() ?? "";
      const comment = commentIdx >= 0 ? (fields[commentIdx]?.trim() ?? "") : "";

      if (!habit || !date || !status) continue;

      rows.push({
        Habit: habit,
        Date: date,
        Status: status,
        Comment: comment || undefined,
      });
    }
    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  }

  // ========== PREVIEW ==========

  async previewImport(
    account: Account,
    file: Express.Multer.File
  ): Promise<HabitSharePreview> {
    const content = file.buffer.toString("utf-8");
    const rows = this.parseCsv(content);

    const warnings: string[] = [];
    const habitNames = new Set<string>();
    let earliest: string | null = null;
    let latest: string | null = null;

    for (const row of rows) {
      if (!VALID_STATUSES.has(row.Status)) {
        warnings.push(`Unknown status '${row.Status}' on row for habit '${row.Habit}' date ${row.Date}`);
        continue;
      }
      habitNames.add(row.Habit);
      if (!earliest || row.Date < earliest) earliest = row.Date;
      if (!latest || row.Date > latest) latest = row.Date;
    }

    const existingHabits = await this.habitRepo.find({
      where: { accountId: account.id },
    });
    const existingNames = new Set(existingHabits.map((h) => h.name));
    const newNames = [...habitNames].filter((n) => !existingNames.has(n));

    return {
      totalRecords: rows.length,
      habits: {
        total: habitNames.size,
        new: newNames.length,
        existing: habitNames.size - newNames.length,
      },
      dateRange: { earliest, latest },
      warnings,
    };
  }

  // ========== EXECUTE ==========

  async executeImport(
    account: Account,
    file: Express.Multer.File
  ): Promise<HabitShareImportResult> {
    const content = file.buffer.toString("utf-8");
    const rows = this.parseCsv(content);

    let habitsCreated = 0;
    let entriesCreated = 0;
    let entriesUpdated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    // Build habit map (name -> Habit entity)
    const habitMap = new Map<string, Habit>();

    const existingHabits = await this.habitRepo.find({
      where: { accountId: account.id },
    });
    for (const h of existingHabits) {
      habitMap.set(h.name, h);
    }

    // Group rows by habit name to process together
    const byHabit = new Map<string, HabitShareRow[]>();
    for (const row of rows) {
      if (!VALID_STATUSES.has(row.Status)) {
        this.logger.warn(`Skipping invalid status '${row.Status}' for ${row.Habit} on ${row.Date}`);
        skipped++;
        continue;
      }
      if (!byHabit.has(row.Habit)) byHabit.set(row.Habit, []);
      byHabit.get(row.Habit)!.push(row);
    }

    // Process each habit
    for (const [habitName, habitRows] of byHabit.entries()) {
      // Get or create habit
      let habit = habitMap.get(habitName);
      if (!habit) {
        habit = this.habitRepo.create({
          name: habitName,
          accountId: account.id,
          account,
          isActive: true,
        });
        habit = await this.habitRepo.save(habit);
        habitMap.set(habitName, habit);
        habitsCreated++;
        this.logger.log(`Created habit: ${habitName}`);
      }

      // Process entries
      for (const row of habitRows) {
        const status = row.Status as HabitStatus;
        const existing = await this.entryRepo.findOne({
          where: {
            habitId: habit.id,
            date: row.Date,
            accountId: account.id,
          },
        });

        if (existing) {
          if (existing.status !== status || existing.comment !== row.Comment) {
            existing.status = status;
            existing.comment = row.Comment;
            await this.entryRepo.save(existing);
            entriesUpdated++;
          } else {
            skipped++;
          }
        } else {
          const entry = this.entryRepo.create({
            habitId: habit.id,
            habit,
            accountId: account.id,
            account,
            date: row.Date,
            status,
            comment: row.Comment,
          });
          await this.entryRepo.save(entry);
          entriesCreated++;
        }
      }
    }

    this.logger.log(
      `Import complete: ${habitsCreated} habits created, ${entriesCreated} entries created, ${entriesUpdated} updated, ${skipped} skipped`
    );

    return {
      habitsCreated,
      entriesCreated,
      entriesUpdated,
      skipped,
      warnings,
    };
  }
}
