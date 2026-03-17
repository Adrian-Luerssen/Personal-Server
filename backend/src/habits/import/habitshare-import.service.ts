import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Habit } from "../entities/habit.entity";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Account } from "../../system/accounts/account.entity";
import { randomUUID } from "crypto";
import { Response } from "express";

export interface HabitShareRow {
  Habit: string;
  Date: string;
  Status: string;
  Comment?: string;
}

export interface HabitSharePreviewResponse {
  previewId: string;
  file: { name: string; size: number };
  counts: {
    habits: { total: number; new: number; existing: number };
    entries: { total: number; new: number; existing: number };
  };
  dateRange: { earliest: string | null; latest: string | null };
  habits: string[];
  warnings: string[];
}

interface HabitSharePreviewData {
  csvContent: string;
  accountId: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
}

export interface HabitShareImportResult {
  habits: { created: number; existing: number };
  entries: { created: number; existing: number };
  warnings: string[];
}

const VALID_STATUSES = new Set<string>(["success", "fail", "skip"]);
const PREVIEW_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class HabitShareImportService {
  private readonly logger = new Logger(HabitShareImportService.name);
  private readonly previewCache = new Map<string, HabitSharePreviewData>();

  constructor(
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>,
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>
  ) {
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, data] of this.previewCache.entries()) {
      if (now - data.createdAt > PREVIEW_TTL_MS) {
        this.previewCache.delete(id);
      }
    }
  }

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
  ): Promise<HabitSharePreviewResponse> {
    const content = file.buffer.toString("utf-8");
    const rows = this.parseCsv(content);

    const warnings: string[] = [];
    const habitNames = new Set<string>();
    const validRows: HabitShareRow[] = [];
    let earliest: string | null = null;
    let latest: string | null = null;

    for (const row of rows) {
      if (!VALID_STATUSES.has(row.Status)) {
        warnings.push(`Unknown status '${row.Status}' on row for habit '${row.Habit}' date ${row.Date}`);
        continue;
      }
      validRows.push(row);
      habitNames.add(row.Habit);
      if (!earliest || row.Date < earliest) earliest = row.Date;
      if (!latest || row.Date > latest) latest = row.Date;
    }

    const existingHabits = await this.habitRepo.find({
      where: { accountId: account.id },
    });
    const existingNames = new Set(existingHabits.map((h) => h.name));
    const newNames = [...habitNames].filter((n) => !existingNames.has(n));

    // Count new vs existing entries
    const existingEntries = await this.entryRepo.find({
      where: { accountId: account.id },
      select: ["habitId", "date"],
    });
    const existingEntryKeys = new Set<string>();
    const habitIdByName = new Map<string, string>();
    for (const h of existingHabits) {
      habitIdByName.set(h.name, h.id);
    }
    for (const e of existingEntries) {
      existingEntryKeys.add(`${e.habitId}:${e.date}`);
    }
    let newEntries = 0;
    let existingEntryCount = 0;
    for (const row of validRows) {
      const hId = habitIdByName.get(row.Habit);
      if (hId && existingEntryKeys.has(`${hId}:${row.Date}`)) {
        existingEntryCount++;
      } else {
        newEntries++;
      }
    }

    const previewId = randomUUID();

    this.previewCache.set(previewId, {
      csvContent: content,
      accountId: account.id,
      fileName: file.originalname || "unknown",
      fileSize: file.size || 0,
      createdAt: Date.now(),
    });

    return {
      previewId,
      file: { name: file.originalname || "unknown", size: file.size || 0 },
      counts: {
        habits: {
          total: habitNames.size,
          new: newNames.length,
          existing: habitNames.size - newNames.length,
        },
        entries: {
          total: validRows.length,
          new: newEntries,
          existing: existingEntryCount,
        },
      },
      dateRange: { earliest, latest },
      habits: [...habitNames],
      warnings,
    };
  }

  // ========== EXECUTE ==========

  async executeImport(
    account: Account,
    previewId: string
  ): Promise<HabitShareImportResult> {
    const previewData = this.previewCache.get(previewId);
    if (!previewData) {
      throw new Error("Preview not found or expired");
    }
    if (previewData.accountId !== account.id) {
      throw new Error("Unauthorized");
    }

    const rows = this.parseCsv(previewData.csvContent);

    let habitsCreated = 0;
    let habitsExisting = 0;
    let entriesCreated = 0;
    let entriesExisting = 0;
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
      } else {
        habitsExisting++;
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
            entriesCreated++; // updated counts as "created" for the summary
          } else {
            entriesExisting++;
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
      `Import complete: ${habitsCreated} habits created, ${entriesCreated} entries created/updated, ${entriesExisting} skipped`
    );

    // Cleanup preview
    this.previewCache.delete(previewId);

    return {
      habits: { created: habitsCreated, existing: habitsExisting },
      entries: { created: entriesCreated, existing: entriesExisting },
      warnings,
    };
  }

  // ========== EXECUTE with SSE ==========

  async executeImportSSE(
    account: Account,
    previewId: string,
    res: Response
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const previewData = this.previewCache.get(previewId);
    if (!previewData) {
      send({ stage: "error", message: "Preview not found or expired", error: "PREVIEW_NOT_FOUND" });
      res.end();
      return;
    }
    if (previewData.accountId !== account.id) {
      send({ stage: "error", message: "Unauthorized", error: "UNAUTHORIZED" });
      res.end();
      return;
    }

    try {
      send({ stage: "starting", progress: 0, message: "Starting HabitShare import..." });

      const rows = this.parseCsv(previewData.csvContent);

      let habitsCreated = 0;
      let habitsExisting = 0;
      let entriesCreated = 0;
      let entriesExisting = 0;

      const habitMap = new Map<string, Habit>();
      const existingHabits = await this.habitRepo.find({
        where: { accountId: account.id },
      });
      for (const h of existingHabits) {
        habitMap.set(h.name, h);
      }

      // Group rows by habit
      const byHabit = new Map<string, HabitShareRow[]>();
      for (const row of rows) {
        if (!VALID_STATUSES.has(row.Status)) continue;
        if (!byHabit.has(row.Habit)) byHabit.set(row.Habit, []);
        byHabit.get(row.Habit)!.push(row);
      }

      const totalEntries = [...byHabit.values()].reduce((s, r) => s + r.length, 0);
      let processedEntries = 0;

      // ---- Stage 1: Habits (0-20%) ----
      send({ stage: "habits", progress: 5, message: "Creating habits..." });
      const habitNames = [...byHabit.keys()];
      for (let i = 0; i < habitNames.length; i++) {
        const habitName = habitNames[i];
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
        } else {
          habitsExisting++;
        }
        send({
          stage: "habits",
          progress: 5 + ((i + 1) / habitNames.length) * 15,
          current: i + 1,
          total: habitNames.length,
          message: `Habits (${i + 1}/${habitNames.length})`,
        });
      }

      // ---- Stage 2: Entries (20-95%) ----
      send({ stage: "entries", progress: 20, message: "Importing entries..." });
      for (const [habitName, habitRows] of byHabit.entries()) {
        const habit = habitMap.get(habitName)!;

        for (const row of habitRows) {
          const status = row.Status as HabitStatus;
          const existing = await this.entryRepo.findOne({
            where: { habitId: habit.id, date: row.Date, accountId: account.id },
          });

          if (existing) {
            if (existing.status !== status || existing.comment !== row.Comment) {
              existing.status = status;
              existing.comment = row.Comment;
              await this.entryRepo.save(existing);
              entriesCreated++;
            } else {
              entriesExisting++;
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

          processedEntries++;
          if (processedEntries % 25 === 0 || processedEntries === totalEntries) {
            send({
              stage: "entries",
              progress: 20 + (processedEntries / totalEntries) * 75,
              current: processedEntries,
              total: totalEntries,
              message: `Entries (${processedEntries}/${totalEntries})`,
            });
          }
        }
      }

      this.previewCache.delete(previewId);

      send({
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        summary: {
          habits: { created: habitsCreated, existing: habitsExisting },
          entries: { created: entriesCreated, existing: entriesExisting },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`HabitShare import failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      send({ stage: "error", progress: 0, message: `Import failed: ${msg}`, error: msg });
    } finally {
      res.end();
    }
  }
}
