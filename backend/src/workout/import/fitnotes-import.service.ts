import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { In, Repository, DataSource, QueryRunner } from "typeorm";
import { WorkoutCategory } from "src/workout/categories/category.entity";
import { WorkoutExercise } from "src/workout/exercises/exercise.entity";
import { BodyWeightEntry } from "src/workout/bodyweight/bodyweight.entity";
import { WorkoutSession } from "src/workout/sessions/session.entity";
import { WorkoutSet } from "src/workout/sets/set.entity";
import { Account } from "src/system/accounts/account.entity";
import {
  FitNotesPreviewResponse,
  FitNotesPreviewData,
  FitNotesProgressEvent,
  FitNotesTopExercise,
} from "./fitnotes-import.dto";

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { Response } from "express";
import { createImportProgressSender } from "../../utils/sse";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";

type SqliteOpenResult = {
  db: any; // better-sqlite3 Database
  tmpPath?: string; // if we created a temp file, remember it for cleanup
};

type AnyObject = Record<string, any>;

// In-memory preview cache (TTL: 30 minutes)
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const BULK_INSERT_CHUNK_SIZE = 500;

@Injectable()
export class FitNotesImportService {
  private readonly logger = new Logger(FitNotesImportService.name);
  private readonly previewCache = new Map<string, FitNotesPreviewData>();

  constructor(
    @InjectRepository(WorkoutCategory)
    private readonly categoryRepo: Repository<WorkoutCategory>,
    @InjectRepository(WorkoutExercise)
    private readonly exerciseRepo: Repository<WorkoutExercise>,
    @InjectRepository(BodyWeightEntry)
    private readonly bodyRepo: Repository<BodyWeightEntry>,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,
    @InjectRepository(WorkoutSet)
    private readonly setRepo: Repository<WorkoutSet>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    private readonly syncService?: SyncService
  ) {
    // Cleanup expired previews every 5 minutes
    const cleanupTimer = setInterval(
      () => this.cleanupExpiredPreviews(),
      5 * 60 * 1000
    );
    cleanupTimer.unref?.();
  }

  private cleanupExpiredPreviews() {
    const now = Date.now();
    for (const [id, data] of this.previewCache.entries()) {
      if (now - data.createdAt > PREVIEW_TTL_MS) {
        // Delete temp file if exists
        if (data.filePath && fs.existsSync(data.filePath)) {
          try {
            fs.unlinkSync(data.filePath);
          } catch {}
        }
        this.previewCache.delete(id);
        this.logger.debug(`Cleaned up expired preview: ${id}`);
      }
    }
  }

  private async writeBufferToTempFile(
    buf: Buffer,
    ext = ".sqlite"
  ): Promise<string> {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `fitnotes-${randomUUID()}${ext}`);
    await fs.promises.writeFile(tmpFile, buf);
    return tmpFile;
  }

  private async openSqlite(
    file: Express.Multer.File
  ): Promise<SqliteOpenResult> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require("better-sqlite3");

    let dbPath: string | undefined;
    let tmpPath: string | undefined;

    if (file.path && fs.existsSync(file.path)) dbPath = file.path;
    else if (file.buffer?.length) {
      const ext = path.extname(file.originalname || "") || ".sqlite";
      tmpPath = await this.writeBufferToTempFile(file.buffer, ext);
      dbPath = tmpPath;
    } else {
      throw new Error("Uploaded file is empty or unavailable.");
    }

    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma("foreign_keys = ON");

    return { db, tmpPath };
  }

  private async openSqliteFromPath(filePath: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require("better-sqlite3");
    const db = new Database(filePath, { readonly: true, fileMustExist: true });
    db.pragma("foreign_keys = ON");
    return db;
  }

  private listTables(db: any): string[] {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    return rows.map((r: AnyObject) => (r.name as string) || "").filter(Boolean);
  }

  private findFirst(tables: string[], candidates: string[]): string | null {
    const lc = new Set(tables.map((t) => t.toLowerCase()));
    for (const c of candidates) {
      if (lc.has(c.toLowerCase()))
        return tables.find((t) => t.toLowerCase() === c.toLowerCase()) || null;
    }
    return null;
  }

  private normalizeDate(dateVal: any): string | null {
    if (!dateVal) return null;
    if (typeof dateVal === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }
    if (typeof dateVal === "number") {
      const d = new Date(dateVal < 2e10 ? dateVal * 1000 : dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  }

  private toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private async insertInChunks(
    manager: QueryRunner["manager"],
    entity: any,
    rows: AnyObject[]
  ): Promise<void> {
    for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK_SIZE) {
      await manager.insert(entity, rows.slice(i, i + BULK_INSERT_CHUNK_SIZE));
    }
  }

  // ============ PREVIEW ============

  async previewImport(
    account: Account,
    file: Express.Multer.File
  ): Promise<FitNotesPreviewResponse> {
    let db: any | undefined;
    let filePath: string | undefined;

    try {
      // Save file to temp location for later use
      const ext = path.extname(file.originalname || "") || ".sqlite";
      if (file.buffer?.length) {
        filePath = await this.writeBufferToTempFile(file.buffer, ext);
      } else if (file.path) {
        // Copy to temp location
        filePath = await this.writeBufferToTempFile(
          await fs.promises.readFile(file.path),
          ext
        );
      } else {
        throw new Error("Uploaded file is empty or unavailable.");
      }

      db = await this.openSqliteFromPath(filePath);
      const tables = this.listTables(db);

      const warnings: string[] = [];

      // Analyze categories
      const categoryTable = this.findFirst(tables, ["Category", "categories"]);
      let categoryRows: AnyObject[] = [];
      if (categoryTable) {
        categoryRows = db.prepare(`SELECT * FROM ${categoryTable}`).all();
      } else {
        warnings.push("Category table not found");
      }

      const existingCategories = await this.categoryRepo.find({
        where: { accountId: account.id },
      });
      const existingCategoryNames = new Set(existingCategories.map((c) => c.name));
      const newCategories = categoryRows.filter(
        (r) => !existingCategoryNames.has((r.name || "").toString().trim())
      );

      // Analyze exercises
      const exerciseTable = this.findFirst(tables, ["exercise", "exercises"]);
      let exerciseRows: AnyObject[] = [];
      if (exerciseTable) {
        exerciseRows = db.prepare(`SELECT * FROM ${exerciseTable}`).all();
      } else {
        warnings.push("Exercise table not found");
      }

      const existingExercises = await this.exerciseRepo.find({
        where: { accountId: account.id },
      });
      const existingExerciseNames = new Set(existingExercises.map((e) => e.name));
      const newExercises = exerciseRows.filter(
        (r) => !existingExerciseNames.has((r.name || "").toString().trim())
      );

      // Analyze training log (sets/sessions)
      const trainingTable = this.findFirst(tables, [
        "training_log",
        "TrainingLog",
      ]);
      let trainingRows: AnyObject[] = [];
      if (trainingTable) {
        trainingRows = db.prepare(`SELECT * FROM ${trainingTable}`).all();
      } else {
        warnings.push("Training log table not found");
      }

      // Group by date for sessions
      const dateSet = new Set<string>();
      let earliestDate: string | null = null;
      let latestDate: string | null = null;
      for (const row of trainingRows) {
        const date = this.normalizeDate(row.date);
        if (date) {
          dateSet.add(date);
          if (!earliestDate || date < earliestDate) earliestDate = date;
          if (!latestDate || date > latestDate) latestDate = date;
        }
      }

      const existingSessions = await this.sessionRepo.find({
        where: { accountId: account.id },
        select: ["date"],
      });
      const existingSessionDates = new Set(existingSessions.map((s) => s.date));
      const newSessionDates = [...dateSet].filter(
        (d) => !existingSessionDates.has(d)
      );

      // Analyze bodyweight
      let bodyweightTable = this.findFirst(tables, ["BodyWeight", "bodyweight"]);
      let bodyweightRows: AnyObject[] = [];
      if (bodyweightTable) {
        bodyweightRows = db.prepare(`SELECT * FROM ${bodyweightTable}`).all();
      }
      if (bodyweightRows.length === 0) {
        bodyweightTable = this.findFirst(tables, ["MeasurementRecord"]);
        if (bodyweightTable) {
          bodyweightRows = db
            .prepare(`SELECT * FROM ${bodyweightTable}`)
            .all();
        }
      }
      if (!bodyweightTable && bodyweightRows.length === 0) {
        warnings.push("Bodyweight table not found");
      }

      const existingBodyweight = await this.bodyRepo.find({
        where: { accountId: account.id },
        select: ["date"],
      });
      const existingBodyDates = new Set(existingBodyweight.map((b) => b.date));
      const newBodyweight = bodyweightRows.filter((r) => {
        const date = this.normalizeDate(r.date);
        return date && !existingBodyDates.has(date);
      });

      // Top exercises by count
      const exerciseCounts: Record<number, number> = {};
      for (const row of trainingRows) {
        const exId = row.exercise_id;
        if (exId) {
          exerciseCounts[exId] = (exerciseCounts[exId] || 0) + 1;
        }
      }
      const exerciseIdToName: Record<number, string> = {};
      for (const row of exerciseRows) {
        exerciseIdToName[row._id] = (row.name || "").toString().trim();
      }
      const topExercises: FitNotesTopExercise[] = Object.entries(exerciseCounts)
        .map(([id, count]) => ({
          name: exerciseIdToName[Number(id)] || `Exercise ${id}`,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const previewId = randomUUID();
      const preview: FitNotesPreviewResponse = {
        previewId,
        file: {
          name: file.originalname || "unknown",
          size: file.size || 0,
          valid: true,
        },
        counts: {
          categories: {
            total: categoryRows.length,
            new: newCategories.length,
            existing: categoryRows.length - newCategories.length,
          },
          exercises: {
            total: exerciseRows.length,
            new: newExercises.length,
            existing: exerciseRows.length - newExercises.length,
          },
          sessions: {
            total: dateSet.size,
            new: newSessionDates.length,
            existing: dateSet.size - newSessionDates.length,
          },
          sets: {
            total: trainingRows.length,
            new: trainingRows.length, // We'd need complex query to know exact new sets
            existing: 0,
          },
          bodyweight: {
            total: bodyweightRows.length,
            new: newBodyweight.length,
            existing: bodyweightRows.length - newBodyweight.length,
          },
        },
        dateRange: {
          earliest: earliestDate,
          latest: latestDate,
        },
        topExercises,
        warnings,
      };

      // Store in cache for execute step
      this.previewCache.set(previewId, {
        filePath,
        accountId: account.id,
        preview,
        createdAt: Date.now(),
      });

      db.close();
      return preview;
    } catch (err) {
      if (db) {
        try {
          db.close();
        } catch {}
      }
      // Clean up temp file on error
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to preview FitNotes file: ${msg}`);
    }
  }

  // ============ EXECUTE WITH SSE ============

  async executeImport(
    account: Account,
    previewId: string,
    res: Response
  ): Promise<void> {
    const sendProgress = createImportProgressSender(res);

    const previewData = this.previewCache.get(previewId);
    if (!previewData) {
      sendProgress({
        stage: "error",
        progress: 0,
        current: 0,
        total: 0,
        message: "Preview not found or expired",
        error: "PREVIEW_NOT_FOUND",
      });
      res.end();
      return;
    }

    if (previewData.accountId !== account.id) {
      sendProgress({
        stage: "error",
        progress: 0,
        current: 0,
        total: 0,
        message: "Preview belongs to different account",
        error: "UNAUTHORIZED",
      });
      res.end();
      return;
    }

    let db: any | undefined;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      sendProgress({
        stage: "starting",
        progress: 0,
        current: 0,
        total: 4,
        message: "Starting import...",
      });

      db = await this.openSqliteFromPath(previewData.filePath);
      const tables = this.listTables(db);

      // Stage 1: Categories (0-25%)
      sendProgress({
        stage: "categories",
        progress: 5,
        current: 0,
        total: previewData.preview.counts.categories.total,
        message: "Importing categories...",
      });
      await this.importCategoriesWithRunner(
        account,
        db,
        tables,
        queryRunner,
        (current, total) => {
          sendProgress({
            stage: "categories",
            progress: 5 + (current / total) * 20,
            current,
            total,
            message: `Importing categories (${current}/${total})...`,
          });
        }
      );

      // Stage 2: Exercises (25-50%)
      sendProgress({
        stage: "exercises",
        progress: 25,
        current: 0,
        total: previewData.preview.counts.exercises.total,
        message: "Importing exercises...",
      });
      await this.importExercisesWithRunner(
        account,
        db,
        tables,
        queryRunner,
        (current, total) => {
          sendProgress({
            stage: "exercises",
            progress: 25 + (current / total) * 25,
            current,
            total,
            message: `Importing exercises (${current}/${total})...`,
          });
        }
      );

      // Stage 3: Sessions/Sets (50-90%)
      sendProgress({
        stage: "sessions",
        progress: 50,
        current: 0,
        total: previewData.preview.counts.sets.total,
        message: "Importing workouts and sets...",
      });
      await this.importWorkoutsAndSetsWithRunner(
        account,
        db,
        tables,
        queryRunner,
        (current, total) => {
          sendProgress({
            stage: "sessions",
            progress: 50 + (current / total) * 40,
            current,
            total,
            message: `Importing sets (${current}/${total})...`,
          });
        }
      );

      // Stage 4: Bodyweight (90-100%)
      sendProgress({
        stage: "bodyweight",
        progress: 90,
        current: 0,
        total: previewData.preview.counts.bodyweight.total,
        message: "Importing bodyweight entries...",
      });
      await this.importBodyWeightWithRunner(
        account,
        db,
        tables,
        queryRunner,
        (current, total) => {
          sendProgress({
            stage: "bodyweight",
            progress: 90 + (current / total) * 10,
            current,
            total,
            message: `Importing bodyweight (${current}/${total})...`,
          });
        }
      );

      // Commit transaction
      await queryRunner.commitTransaction();
      await this.recordImportSync(account.id, "fitnotes-import", previewData.preview.counts);

      sendProgress({
        stage: "complete",
        progress: 100,
        current: 0,
        total: 0,
        message: "Import completed successfully!",
        summary: {
          categories: {
            created: previewData.preview.counts.categories.new,
            existing: previewData.preview.counts.categories.existing,
          },
          exercises: {
            created: previewData.preview.counts.exercises.new,
            existing: previewData.preview.counts.exercises.existing,
          },
          sessions: {
            created: previewData.preview.counts.sessions.new,
            existing: previewData.preview.counts.sessions.existing,
          },
          sets: {
            created: previewData.preview.counts.sets.new,
            existing: previewData.preview.counts.sets.existing,
          },
          bodyweight: {
            created: previewData.preview.counts.bodyweight.new,
            existing: previewData.preview.counts.bodyweight.existing,
          },
        },
      });

      // Cleanup preview
      this.previewCache.delete(previewId);
      if (previewData.filePath && fs.existsSync(previewData.filePath)) {
        try {
          fs.unlinkSync(previewData.filePath);
        } catch {}
      }
    } catch (err) {
      // Rollback on error
      try {
        await queryRunner.rollbackTransaction();
      } catch {}

      const msg = err instanceof Error ? err.message : String(err);
      sendProgress({
        stage: "error",
        progress: 0,
        current: 0,
        total: 0,
        message: `Import failed: ${msg}`,
        error: msg,
      });
    } finally {
      try {
        db?.close();
      } catch {}
      await queryRunner.release();
      res.end();
    }
  }

  // ============ IMPORT METHODS WITH QUERY RUNNER ============

  private async importCategoriesWithRunner(
    account: Account,
    db: any,
    tables: string[],
    queryRunner: QueryRunner,
    onProgress: (current: number, total: number) => void
  ) {
    const table = this.findFirst(tables, ["Category", "categories"]);
    if (!table) return;

    const rows: AnyObject[] = db.prepare(`SELECT * FROM ${table}`).all();
    const manager = queryRunner.manager;

    const existingCategories = await manager.find(WorkoutCategory, {
      where: { accountId: account.id },
      select: ["name"],
    });
    const existingNames = new Set(existingCategories.map((category) => category.name));
    const categoriesToInsert: WorkoutCategory[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || "").toString().trim();
      if (!name) continue;

      if (!existingNames.has(name)) {
        const cat = manager.create(WorkoutCategory, {
          accountId: account.id,
          account,
          name,
        });
        categoriesToInsert.push(cat);
        existingNames.add(name);
      }
      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }

    await this.insertInChunks(manager, WorkoutCategory, categoriesToInsert);
  }

  private async importExercisesWithRunner(
    account: Account,
    db: any,
    tables: string[],
    queryRunner: QueryRunner,
    onProgress: (current: number, total: number) => void
  ) {
    const table = this.findFirst(tables, ["exercise", "exercises"]);
    if (!table) return;

    const manager = queryRunner.manager;

    // Build category map
    const categoryMap = new Map<number, string>();
    const categories = await manager.find(WorkoutCategory, {
      where: { accountId: account.id },
    });

    const catTable = this.findFirst(tables, ["Category", "categories"]);
    if (catTable) {
      const catRows: AnyObject[] = db
        .prepare(`SELECT _id, name FROM ${catTable}`)
        .all();
      for (const catRow of catRows) {
        const fitNotesCatId = catRow._id;
        const catName = (catRow.name || "").toString().trim();
        const ourCat = categories.find((c) => c.name === catName);
        if (ourCat) {
          categoryMap.set(fitNotesCatId, ourCat.id);
        }
      }
    }

    const rows: AnyObject[] = db.prepare(`SELECT * FROM ${table}`).all();
    const existingExercises = await manager.find(WorkoutExercise, {
      where: { accountId: account.id },
    });
    const exerciseByName = new Map(
      existingExercises.map((exercise) => [exercise.name, exercise])
    );
    const exercisesToInsert: WorkoutExercise[] = [];
    const exercisesToUpdate: WorkoutExercise[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || "").toString().trim();
      if (!name) continue;

      let categoryId: string | null = null;
      if (row.category_id) {
        categoryId = categoryMap.get(row.category_id) || null;
      }

      const existing = exerciseByName.get(name);
      if (!existing) {
        const ex = manager.create(WorkoutExercise, {
          accountId: account.id,
          account,
          name,
          categoryId,
          notes: row.notes || null,
        });
        exercisesToInsert.push(ex);
      } else if (categoryId && !existing.categoryId) {
        existing.categoryId = categoryId;
        exercisesToUpdate.push(existing);
      }
      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }

    await this.insertInChunks(manager, WorkoutExercise, exercisesToInsert);
    if (exercisesToUpdate.length > 0) {
      await manager.save(exercisesToUpdate);
    }
  }

  private async importBodyWeightWithRunner(
    account: Account,
    db: any,
    tables: string[],
    queryRunner: QueryRunner,
    onProgress: (current: number, total: number) => void
  ) {
    const manager = queryRunner.manager;

    let table = this.findFirst(tables, ["BodyWeight", "bodyweight"]);
    let rows: AnyObject[] = [];
    if (table) {
      rows = db.prepare(`SELECT * FROM ${table}`).all();
    }
    if (rows.length === 0) {
      table = this.findFirst(tables, ["MeasurementRecord"]);
      if (table) {
        rows = db.prepare(`SELECT * FROM ${table}`).all();
      }
    }

    const dates = rows
      .map((row) => this.normalizeDate(row.date))
      .filter((date): date is string => Boolean(date));
    const existingEntries =
      dates.length > 0
        ? await manager.find(BodyWeightEntry, {
            where: { accountId: account.id, date: In([...new Set(dates)]) },
          })
        : [];
    const existingByDate = new Map(existingEntries.map((entry) => [entry.date, entry]));
    // FitNotes may contain multiple measurements on the same day. The database
    // conflict key is account + date, so keep only the last source row for each
    // date before issuing a bulk upsert. PostgreSQL cannot update the same
    // conflict target twice within one INSERT statement.
    const entryToUpsertByDate = new Map<string, AnyObject>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dateVal = row.date;
      const weightVal = row.body_weight_metric || row.value;
      if (!dateVal || !weightVal) continue;

      const date = this.normalizeDate(dateVal);
      const weight = Number(weightVal);
      if (!date || isNaN(weight)) continue;

      const existing = existingByDate.get(date);
      if (!existing || Number(existing.weightKg) !== weight || existing.note !== (row.comments || null)) {
        entryToUpsertByDate.set(date, {
          accountId: account.id,
          account,
          date,
          weightKg: weight,
          note: row.comments || null,
        });
      } else {
        // The last FitNotes value for this date already matches the database.
        entryToUpsertByDate.delete(date);
      }
      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }

    const entriesToUpsert = [...entryToUpsertByDate.values()];
    for (let i = 0; i < entriesToUpsert.length; i += BULK_INSERT_CHUNK_SIZE) {
      await manager.upsert(
        BodyWeightEntry,
        entriesToUpsert.slice(i, i + BULK_INSERT_CHUNK_SIZE),
        ["accountId", "date"]
      );
    }
  }

  private async importWorkoutsAndSetsWithRunner(
    account: Account,
    db: any,
    tables: string[],
    queryRunner: QueryRunner,
    onProgress: (current: number, total: number) => void
  ) {
    const manager = queryRunner.manager;

    const table = this.findFirst(tables, ["training_log", "TrainingLog"]);
    if (!table) return;

    // Build exercise map
    const exerciseMap = new Map<number, WorkoutExercise>();
    const exTable = this.findFirst(tables, ["exercise", "exercises"]);
    if (exTable) {
      const exRows: AnyObject[] = db
        .prepare(`SELECT _id, name FROM ${exTable}`)
        .all();
      const ourExercises = await manager.find(WorkoutExercise, {
        where: { accountId: account.id },
      });
      for (const exRow of exRows) {
        const fitNotesExId = exRow._id;
        const exName = (exRow.name || "").toString().trim();
        const ourEx = ourExercises.find((e) => e.name === exName);
        if (ourEx) {
          exerciseMap.set(fitNotesExId, ourEx);
        }
      }
    }

    const rows: AnyObject[] = db
      .prepare(`SELECT * FROM ${table} ORDER BY date, _id`)
      .all();

    // Group by date
    const grouped: Record<string, AnyObject[]> = {};
    for (const row of rows) {
      const dateVal = row.date;
      const key = this.normalizeDate(dateVal);
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    // Get workout times
    const workoutTable = this.findFirst(tables, ["workout", "WorkoutTime"]);
    let workoutRows: AnyObject[] = [];
    if (workoutTable) {
      workoutRows = db.prepare(`SELECT * FROM ${workoutTable}`).all();
    }

    let persistedSets = 0;
    const totalSets = Object.values(grouped).reduce(
      (total, items) => total + items.length,
      0
    );

    // Session cache to avoid repeated lookups
    const dates = Object.keys(grouped);
    const existingSessions =
      dates.length > 0
        ? await manager.find(WorkoutSession, {
            where: { accountId: account.id, date: In(dates) },
          })
        : [];
    const sessionCache = new Map(existingSessions.map((session) => [session.date, session]));
    const sessionRowsToInsert: WorkoutSession[] = [];
    const sessionRowsToUpdate: WorkoutSession[] = [];
    const existingSets = await manager.find(WorkoutSet, {
      where: { accountId: account.id },
      select: ["sessionId", "order"],
    });
    const maxOrderBySession = new Map<string, number>();
    for (const set of existingSets) {
      maxOrderBySession.set(
        set.sessionId,
        Math.max(maxOrderBySession.get(set.sessionId) ?? -1, set.order)
      );
    }

    for (const [date, items] of Object.entries(grouped)) {
      const workout = workoutRows.find((w) => {
        const workoutDate = this.normalizeDate(w.start_date_time);
        return workoutDate === date;
      });
      let startAt: Date | null = null;
      let endAt: Date | null = null;
      if (workout) {
        startAt = workout.start_date_time
          ? new Date(workout.start_date_time)
          : null;
        endAt = workout.end_date_time ? new Date(workout.end_date_time) : null;
      }

      let session = sessionCache.get(date);
      if (!session) {
        session = manager.create(WorkoutSession, {
          id: randomUUID(),
          accountId: account.id,
          account,
          date,
          title: null,
          notes: null,
          startAt: startAt ?? new Date(`${date}T06:00:00.000Z`),
          endAt: endAt ?? null,
        });
        sessionRowsToInsert.push(session);
      } else if ((startAt && !session.startAt) || (endAt && !session.endAt)) {
        if (startAt && !session.startAt) session.startAt = startAt;
        if (endAt && !session.endAt) session.endAt = endAt;
        sessionRowsToUpdate.push(session);
      }

      sessionCache.set(date, session);
    }

    await this.insertInChunks(manager, WorkoutSession, sessionRowsToInsert);
    if (sessionRowsToUpdate.length > 0) {
      await manager.save(sessionRowsToUpdate);
    }

    let pendingSetRows: WorkoutSet[] = [];

    const flushSetRows = async () => {
      if (pendingSetRows.length === 0) return;
      const batch = pendingSetRows;
      pendingSetRows = [];
      await manager.insert(WorkoutSet, batch);
      persistedSets += batch.length;
      onProgress(persistedSets, totalSets);
    };

    for (const [date, items] of Object.entries(grouped)) {
      const session = sessionCache.get(date)!;
      let nextOrder = (maxOrderBySession.get(session.id) ?? -1) + 1;
      for (const row of items) {
        const exerciseId = row.exercise_id;
        const exercise = exerciseId ? exerciseMap.get(exerciseId) : null;

        const reps = this.toNumberOrNull(row.reps);
        const weight = this.toNumberOrNull(row.metric_weight);
        const distance = this.toNumberOrNull(row.distance);
        const durationSec = this.toNumberOrNull(row.duration_seconds);

        pendingSetRows.push(
          manager.create(WorkoutSet, {
            accountId: account.id,
            account,
            sessionId: session.id,
            order: nextOrder,
            exerciseId: exercise?.id ?? null,
            reps,
            weight,
            distance,
            durationSec,
            rpe: null,
            notes: null,
          })
        );
        nextOrder++;
        if (pendingSetRows.length >= BULK_INSERT_CHUNK_SIZE) {
          await flushSetRows();
        }
      }
    }

    await flushSetRows();
  }

  // ============ LEGACY METHOD (for backwards compatibility) ============

  async importFromSqlite(account: Account, file: Express.Multer.File) {
    let db: any | undefined;
    let tmpPath: string | undefined;

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const opened = await this.openSqlite(file);
      db = opened.db;
      tmpPath = opened.tmpPath;

      const tables = this.listTables(db);

      await this.importCategoriesWithRunner(
        account,
        db,
        tables,
        queryRunner,
        () => {}
      );
      await this.importExercisesWithRunner(
        account,
        db,
        tables,
        queryRunner,
        () => {}
      );
      await this.importWorkoutsAndSetsWithRunner(
        account,
        db,
        tables,
        queryRunner,
        () => {}
      );
      await this.importBodyWeightWithRunner(
        account,
        db,
        tables,
        queryRunner,
        () => {}
      );

      await queryRunner.commitTransaction();
      await this.recordImportSync(account.id, "fitnotes-import");
      return { status: "ok" };
    } catch (err) {
      try {
        await queryRunner.rollbackTransaction();
      } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to import from SQLite file: ${msg}`);
    } finally {
      try {
        db?.close();
      } catch {}
      await queryRunner.release();
      if (tmpPath) {
        try {
          await fs.promises.unlink(tmpPath);
        } catch {}
      }
    }
  }

  private async recordImportSync(
    accountId: string,
    source: string,
    counts?: FitNotesPreviewResponse["counts"]
  ): Promise<void> {
    if (!this.syncService) return;
    if (
      counts &&
      counts.categories.new === 0 &&
      counts.exercises.new === 0 &&
      counts.sessions.new === 0 &&
      counts.sets.new === 0 &&
      counts.bodyweight.new === 0
    ) {
      return;
    }

    await this.syncService.recordEvent(accountId, {
      entityType: "workout-session",
      entityId: randomUUID(),
      operation: SyncOperation.UPSERT,
      payload: { source, counts: counts ?? null },
    });
  }
}
