import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkoutCategory } from "src/workout/categories/category.entity";
import { WorkoutExercise } from "src/workout/exercises/exercise.entity";
import { BodyWeightEntry } from "src/workout/bodyweight/bodyweight.entity";
import { WorkoutSession } from "src/workout/sessions/session.entity";
import { WorkoutSet } from "src/workout/sets/set.entity";
import { Account } from "src/system/accounts/account.entity";

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";

type SqliteOpenResult = {
  db: any; // better-sqlite3 Database
  tmpPath?: string; // if we created a temp file, remember it for cleanup
};

type AnyObject = Record<string, any>;

@Injectable()
export class FitNotesImportService {
  private readonly logger = new Logger(FitNotesImportService.name);

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
    private readonly setRepo: Repository<WorkoutSet>
  ) {}

  private async writeBufferToTempFile(
    buf: Buffer,
    ext = ".sqlite"
  ): Promise<string> {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `upload-${randomUUID()}${ext}`);
    await fs.promises.writeFile(tmpFile, buf);
    return tmpFile;
  }
  // Dynamically require better-sqlite3 to avoid type issues at compile-time
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

    // OPEN READONLY and DO NOT change journal_mode
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    // Safe PRAGMAs only (connection-scoped, not writing to the DB file)
    db.pragma("foreign_keys = ON"); // OK

    return { db, tmpPath };
  }

  async importFromSqlite(account: Account, file: Express.Multer.File) {
    let db: any | undefined;
    let tmpPath: string | undefined;

    // Open the DB file
    try {
      const opened = await this.openSqlite(file);
      db = opened.db;
      tmpPath = opened.tmpPath;

      const tables = this.listTables(db);
      // Import order: categories -> exercises -> bodyweight -> sessions/sets
      await this.importCategories(account, db, tables);
      await this.importExercises(account, db, tables);
      await this.importBodyWeight(account, db, tables);
      await this.importWorkoutsAndSets(account, db, tables);

      return { status: "ok" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to import from SQLite file: ${msg}`);
    } finally {
      try {
        db?.close();
      } catch {}
      if (tmpPath) {
        try {
          await fs.promises.unlink(tmpPath);
        } catch {}
      }
    }
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

  private async importCategories(account: Account, db: any, tables: string[]) {
    // FitNotes schema: Category table with columns: _id, name, colour, sort_order
    const table = this.findFirst(tables, ["Category", "categories"]);
    if (!table) {
      this.logger.warn("Category table not found, skipping categories import");
      return;
    }
    const rows: AnyObject[] = db.prepare(`SELECT * FROM ${table}`).all();
    this.logger.log(`Importing ${rows.length} categories from ${table}`);

    for (const row of rows) {
      const name = (row.name || "").toString().trim();
      if (!name) continue;

      let existing = await this.categoryRepo.findOne({
        where: { accountId: account.id, name },
      });
      if (!existing) {
        const cat = this.categoryRepo.create({
          accountId: account.id,
          account,
          name,
        });
        existing = await this.categoryRepo.save(cat);
        this.logger.debug(`Created category: ${name}`);
      }
    }
  }

  private async importExercises(account: Account, db: any, tables: string[]) {
    // FitNotes schema: exercise table with columns: _id, name, category_id, exercise_type_id, notes, weight_increment, default_rest_time, weight_unit_id, is_favourite, default_graph_id
    const table = this.findFirst(tables, ["exercise", "exercises"]);
    if (!table) {
      this.logger.warn("exercise table not found, skipping exercises import");
      return;
    }

    // First, get all categories to map category_id
    const categoryMap = new Map<number, string>(); // FitNotes category_id -> our UUID
    const categories = await this.categoryRepo.find({
      where: { accountId: account.id },
    });

    // Try to match by fetching FitNotes categories
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
    this.logger.log(`Importing ${rows.length} exercises from ${table}`);

    for (const row of rows) {
      const name = (row.name || "").toString().trim();
      if (!name) continue;

      let categoryId: string | null | undefined = null;
      if (row.category_id) {
        categoryId = categoryMap.get(row.category_id) || null;
      }

      let existing = await this.exerciseRepo.findOne({
        where: { accountId: account.id, name },
      });
      if (!existing) {
        const ex = this.exerciseRepo.create({
          accountId: account.id,
          account,
          name,
          categoryId,
          notes: row.notes || null,
        });
        existing = await this.exerciseRepo.save(ex);
        this.logger.debug(`Created exercise: ${name}`);
      } else if (categoryId && !existing.categoryId) {
        // Update category if missing
        existing.categoryId = categoryId;
        await this.exerciseRepo.save(existing);
      }
    }
  }

  private async importBodyWeight(account: Account, db: any, tables: string[]) {
    // FitNotes schema: BodyWeight table with columns: _id, date, body_weight_metric, body_fat, comments
    let table = this.findFirst(tables, ["BodyWeight", "bodyweight"]);
    if (!table) {
      this.logger.warn(
        "BodyWeight table not found, skipping bodyweight import"
      );
      return;
    }

    let rows: AnyObject[] = db.prepare(`SELECT * FROM ${table}`).all();
    this.logger.log(
      `Importing ${rows.length} bodyweight entries from ${table}`
    );
    if (rows.length === 0) {
      let table = this.findFirst(tables, ["MeasurementRecord"]);
      if (!table) {
        this.logger.warn(
          "MeasurementRecord table not found, skipping bodyweight import"
        );
        return;
      }
      rows = db.prepare(`SELECT * FROM ${table}`).all();
    }

    for (const row of rows) {
      const dateVal = row.date;
      const weightVal = row.body_weight_metric || row.value;
      if (!dateVal || !weightVal) continue;

      const date = this.normalizeDate(dateVal);
      const weight = Number(weightVal);
      if (!date || isNaN(weight)) continue;

      let existing = await this.bodyRepo.findOne({
        where: { accountId: account.id, date },
      });
      if (!existing) {
        existing = await this.bodyRepo.save(
          this.bodyRepo.create({
            accountId: account.id,
            account,
            date,
            weightKg: weight,
            note: row.comments || null,
          })
        );
        this.logger.debug(`Created bodyweight entry for ${date}: ${weight}kg`);
      } else if (existing.weightKg !== weight) {
        // Update if different
        existing.weightKg = weight;
        if (row.comments) existing.note = row.comments;
        await this.bodyRepo.save(existing);
        this.logger.debug(`Updated bodyweight entry for ${date}: ${weight}kg`);
      }
    }
  }

  private async importWorkoutsAndSets(
    account: Account,
    db: any,
    tables: string[]
  ) {
    // FitNotes schema: training_log table with columns:
    // _id, exercise_id, date, metric_weight, reps, unit, distance, duration_seconds, routine_section_exercise_set_id, timer_auto_start, is_personal_record, is_personal_record_first, is_complete, is_pending_update
    const table = this.findFirst(tables, ["training_log", "TrainingLog"]);
    if (!table) {
      this.logger.warn(
        "training_log table not found, skipping workouts import"
      );
      return;
    }

    // Build exercise map: FitNotes exercise_id -> our exercise
    const exerciseMap = new Map<number, WorkoutExercise>();
    const exTable = this.findFirst(tables, ["exercise", "exercises"]);
    if (exTable) {
      const exRows: AnyObject[] = db
        .prepare(`SELECT _id, name FROM ${exTable}`)
        .all();
      const ourExercises = await this.exerciseRepo.find({
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
    this.logger.log(`Importing ${rows.length} sets from ${table}`);

    // Group training_log rows by date
    const grouped: Record<string, AnyObject[]> = {};
    for (const row of rows) {
      const dateVal = row.date;
      const key = this.normalizeDate(dateVal);
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    // Get all workouts (sessions) from workout table
    const workoutTable = this.findFirst(tables, ["workout", "WorkoutTime"]);
    let workoutRows: AnyObject[] = [];
    if (workoutTable) {
      workoutRows = db.prepare(`SELECT * FROM ${workoutTable}`).all();
    }

    let createdSessions = 0;
    let createdSets = 0;

    for (const [date, items] of Object.entries(grouped)) {
      // Find matching workout row for this date
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
      // Create or update session for this date
      let session = await this.sessionRepo.findOne({
        where: { accountId: account.id, date },
      });
      if (!session) {
        session = await this.sessionRepo.save(
          this.sessionRepo.create({
            accountId: account.id,
            account,
            date,
            title: null,
            notes: null,
            startAt: startAt ?? new Date(`${date}T06:00:00.000Z`),
            endAt: endAt ?? null,
          })
        );
        createdSessions++;
      } else {
        // Update start/end time if missing
        let updated = false;
        if (startAt && !session.startAt) {
          session.startAt = startAt;
          updated = true;
        }
        if (endAt && !session.endAt) {
          session.endAt = endAt;
          updated = true;
        }
        if (updated) await this.sessionRepo.save(session);
      }

      // Import sets for this session
      let nextOrder = await this.getNextOrder(session.id);
      for (const row of items) {
        const exerciseId = row.exercise_id;
        const exercise = exerciseId ? exerciseMap.get(exerciseId) : null;

        const reps = this.toNumberOrNull(row.reps);
        const weight = this.toNumberOrNull(row.metric_weight);
        const distance = this.toNumberOrNull(row.distance);
        const durationSec = this.toNumberOrNull(row.duration_seconds);

        // Dedup: check if a set with same values exists at this order
        const existing = await this.setRepo.findOne({
          where: {
            sessionId: session.id,
            order: nextOrder,
            exerciseId: exercise?.id ?? null,
            reps: reps ?? null,
            weight: weight ?? null,
            distance: distance ?? null,
            durationSec: durationSec ?? null,
          },
        });

        if (!existing) {
          await this.setRepo.save(
            this.setRepo.create({
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
          createdSets++;
        }
        nextOrder++;
      }
    }

    this.logger.log(
      `Created ${createdSessions} sessions and ${createdSets} sets`
    );
  }

  private async getNextOrder(sessionId: string): Promise<number> {
    const row = await this.setRepo
      .createQueryBuilder("s")
      .where("s.sessionId = :sessionId", { sessionId })
      .select("MAX(s.order)", "max")
      .getRawOne<{ max: number | null }>();
    return (row?.max ?? -1) + 1;
  }

  private normalizeDate(dateVal: any): string | null {
    // FitNotes uses TEXT format "yyyy-MM-dd" or epoch milliseconds
    if (!dateVal) return null;
    if (typeof dateVal === "string") {
      // Already in yyyy-MM-dd format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
      // Try parsing as ISO
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    }
    if (typeof dateVal === "number") {
      // Assume epoch millis if > 2e10, else seconds
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
}
