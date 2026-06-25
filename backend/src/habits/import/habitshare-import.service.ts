import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Habit } from "../entities/habit.entity";
import { HabitEntry, HabitStatus } from "../entities/habit-entry.entity";
import { Account } from "../../system/accounts/account.entity";
import { randomUUID } from "crypto";
import { Response } from "express";
import { createImportProgressSender } from "../../utils/sse";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";

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

interface ParsedHabitShareRows {
  byHabit: Map<string, HabitShareRow[]>;
  totalEntries: number;
  warnings: string[];
}

interface HabitShareImportProgress {
  onHabitsStart?: () => void;
  onHabit?: (current: number, total: number) => void;
  onEntriesStart?: (total: number) => void;
  onEntries?: (current: number, total: number) => void;
}

type HabitEntryUpsertRow = {
  habitId: string;
  accountId: string;
  date: string;
  status: HabitStatus;
  comment: string | null;
};

const VALID_STATUSES = new Set<string>(["success", "fail", "skip"]);
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const ENTRY_UPSERT_CHUNK_SIZE = 500;

@Injectable()
export class HabitShareImportService {
  private readonly logger = new Logger(HabitShareImportService.name);
  private readonly previewCache = new Map<string, HabitSharePreviewData>();

  constructor(
    @InjectRepository(Habit)
    private readonly habitRepo: Repository<Habit>,
    @InjectRepository(HabitEntry)
    private readonly entryRepo: Repository<HabitEntry>,
    @Optional()
    private readonly syncService?: SyncService
  ) {
    const cleanupTimer = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
    cleanupTimer.unref?.();
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

  private groupValidRows(rows: HabitShareRow[]): ParsedHabitShareRows {
    const byHabit = new Map<string, HabitShareRow[]>();
    const warnings: string[] = [];
    let totalEntries = 0;

    for (const row of rows) {
      if (!VALID_STATUSES.has(row.Status)) {
        const warning = `Skipping invalid status '${row.Status}' for ${row.Habit} on ${row.Date}`;
        this.logger.warn(warning);
        warnings.push(warning);
        continue;
      }

      if (!byHabit.has(row.Habit)) byHabit.set(row.Habit, []);
      byHabit.get(row.Habit)!.push(row);
      totalEntries++;
    }

    return { byHabit, totalEntries, warnings };
  }

  private entryKey(habitId: string, date: string): string {
    return `${habitId}:${date}`;
  }

  private normalizeComment(comment?: string): string | null {
    return comment && comment.length > 0 ? comment : null;
  }

  private async executePreparedImport(
    account: Account,
    previewId: string,
    previewData: HabitSharePreviewData,
    progress?: HabitShareImportProgress
  ): Promise<HabitShareImportResult> {
    const rows = this.parseCsv(previewData.csvContent);
    const { byHabit, totalEntries, warnings } = this.groupValidRows(rows);

    let habitsCreated = 0;
    let habitsExisting = 0;
    let entriesCreated = 0;

    const habitMap = new Map<string, Habit>();
    const existingHabits = await this.habitRepo.find({
      where: { accountId: account.id },
    });
    for (const h of existingHabits) {
      habitMap.set(h.name, h);
    }

    const habitNames = [...byHabit.keys()];
    progress?.onHabitsStart?.();
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
        this.logger.log(`Created habit: ${habitName}`);
      } else {
        habitsExisting++;
      }
      progress?.onHabit?.(i + 1, habitNames.length);
    }

    const existingEntries = await this.entryRepo.find({
      where: { accountId: account.id },
      select: ["habitId", "date", "status", "comment"],
    });
    const existingEntryMap = new Map<string, HabitEntry>();
    for (const entry of existingEntries) {
      existingEntryMap.set(this.entryKey(entry.habitId, String(entry.date)), entry);
    }

    const importedEntryMap = new Map<string, HabitEntryUpsertRow>();
    for (const [habitName, habitRows] of byHabit.entries()) {
      const habit = habitMap.get(habitName)!;
      for (const row of habitRows) {
        importedEntryMap.set(this.entryKey(habit.id, row.Date), {
          habitId: habit.id,
          accountId: account.id,
          date: row.Date,
          status: row.Status as HabitStatus,
          comment: this.normalizeComment(row.Comment),
        });
      }
    }

    const rowsToUpsert: HabitEntryUpsertRow[] = [];
    for (const imported of importedEntryMap.values()) {
      const existing = existingEntryMap.get(
        this.entryKey(imported.habitId, imported.date)
      );
      if (
        existing &&
        existing.status === imported.status &&
        this.normalizeComment(existing.comment) === imported.comment
      ) {
        continue;
      }
      rowsToUpsert.push(imported);
    }

    progress?.onEntriesStart?.(rowsToUpsert.length);
    let persistedEntries = 0;
    for (let i = 0; i < rowsToUpsert.length; i += ENTRY_UPSERT_CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + ENTRY_UPSERT_CHUNK_SIZE);
      await this.entryRepo.upsert(chunk, ["habitId", "date"]);
      persistedEntries += chunk.length;
      progress?.onEntries?.(persistedEntries, rowsToUpsert.length);
    }

    entriesCreated = rowsToUpsert.length;
    const entriesExisting = Math.max(totalEntries - entriesCreated, 0);

    this.logger.log(
      `Import complete: ${habitsCreated} habits created, ${entriesCreated} entries created/updated, ${entriesExisting} skipped`
    );

    const result = {
      habits: { created: habitsCreated, existing: habitsExisting },
      entries: { created: entriesCreated, existing: entriesExisting },
      warnings,
    };
    await this.recordImportSync(account.id, previewId, result);

    this.previewCache.delete(previewId);

    return result;
  }

  private async recordImportSync(
    accountId: string,
    previewId: string,
    result: HabitShareImportResult
  ): Promise<void> {
    if (!this.syncService) return;
    if (result.habits.created === 0 && result.entries.created === 0) return;

    await this.syncService.recordEvent(accountId, {
      entityType: "habit-entry",
      entityId: randomUUID(),
      operation: SyncOperation.UPSERT,
      payload: {
        source: "habitshare-import",
        previewId,
        habits: result.habits,
        entries: result.entries,
        warnings: result.warnings,
      },
    });
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

    return this.executePreparedImport(account, previewId, previewData);
  }

  // ========== EXECUTE with SSE ==========

  async executeImportSSE(
    account: Account,
    previewId: string,
    res: Response
  ): Promise<void> {
    const send = createImportProgressSender(res);

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

      const result = await this.executePreparedImport(account, previewId, previewData, {
        onHabitsStart: () => {
          send({ stage: "habits", progress: 5, message: "Creating habits..." });
        },
        onHabit: (current, total) => {
          send({
            stage: "habits",
            progress: total > 0 ? 5 + (current / total) * 15 : 20,
            current,
            total,
            message: total > 0 ? `Habits (${current}/${total})` : "No habits to create",
          });
        },
        onEntriesStart: (total) => {
          send({
            stage: "entries",
            progress: total > 0 ? 20 : 95,
            current: 0,
            total,
            message: total > 0 ? "Importing entries..." : "Entries already up to date",
          });
        },
        onEntries: (current, total) => {
          send({
            stage: "entries",
            progress: total > 0 ? 20 + (current / total) * 75 : 95,
            current,
            total,
            message: `Entries (${current}/${total})`,
          });
        },
      });

      send({
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        summary: {
          habits: result.habits,
          entries: result.entries,
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
