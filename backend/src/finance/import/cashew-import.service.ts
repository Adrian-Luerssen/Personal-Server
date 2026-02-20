import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { FinanceWallet } from "../entities/wallet.entity";
import { FinanceCategory } from "../entities/category.entity";
import { FinanceTransaction } from "../entities/transaction.entity";
import { Account } from "../../system/accounts/account.entity";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { Response } from "express";

type AnyObject = Record<string, any>;

const PREVIEW_TTL_MS = 30 * 60 * 1000;

interface CashewPreviewData {
  filePath: string;
  accountId: string;
  counts: {
    wallets: { total: number; new: number; existing: number };
    categories: { total: number; new: number; existing: number };
    transactions: { total: number; new: number; existing: number };
  };
  dateRange: { earliest: string | null; latest: string | null };
  createdAt: number;
}

export interface CashewPreviewResponse {
  previewId: string;
  file: { name: string; size: number; valid: boolean };
  counts: CashewPreviewData["counts"];
  dateRange: CashewPreviewData["dateRange"];
  warnings: string[];
}

@Injectable()
export class CashewImportService {
  private readonly logger = new Logger(CashewImportService.name);
  private readonly previewCache = new Map<string, CashewPreviewData>();

  constructor(
    @InjectRepository(FinanceWallet)
    private readonly walletRepo: Repository<FinanceWallet>,
    @InjectRepository(FinanceCategory)
    private readonly categoryRepo: Repository<FinanceCategory>,
    @InjectRepository(FinanceTransaction)
    private readonly transactionRepo: Repository<FinanceTransaction>,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, data] of this.previewCache.entries()) {
      if (now - data.createdAt > PREVIEW_TTL_MS) {
        try {
          if (data.filePath && fs.existsSync(data.filePath)) {
            fs.unlinkSync(data.filePath);
          }
        } catch {}
        this.previewCache.delete(id);
      }
    }
  }

  private async writeBufferToTempFile(buf: Buffer, ext = ".sqlite"): Promise<string> {
    const tmpFile = path.join(os.tmpdir(), `cashew-${randomUUID()}${ext}`);
    await fs.promises.writeFile(tmpFile, buf);
    return tmpFile;
  }

  private openSqlite(filePath: string): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require("better-sqlite3");
    const db = new Database(filePath, { readonly: true, fileMustExist: true });
    db.pragma("foreign_keys = ON");
    return db;
  }

  private unixToDate(val: any): Date | null {
    if (!val) return null;
    const n = typeof val === "number" ? val : Number(val);
    if (isNaN(n)) return null;
    // Cashew stores milliseconds
    return new Date(n);
  }

  // =========== PREVIEW ===========

  async previewImport(
    account: Account,
    file: Express.Multer.File
  ): Promise<CashewPreviewResponse> {
    let filePath: string | undefined;
    let db: any;
    const warnings: string[] = [];

    try {
      const ext = path.extname(file.originalname || "") || ".sqlite";
      if (file.buffer?.length) {
        filePath = await this.writeBufferToTempFile(file.buffer, ext);
      } else if (file.path && fs.existsSync(file.path)) {
        filePath = await this.writeBufferToTempFile(
          await fs.promises.readFile(file.path),
          ext
        );
      } else {
        throw new Error("Uploaded file is empty or unavailable.");
      }

      db = this.openSqlite(filePath);

      // --- Wallets ---
      let walletRows: AnyObject[] = [];
      try {
        walletRows = db.prepare("SELECT * FROM wallets").all();
      } catch {
        warnings.push("wallets table not found");
      }
      const existingWalletIds = new Set(
        (await this.walletRepo.find({ where: { accountId: account.id }, select: ["externalId"] }))
          .map((w) => w.externalId)
          .filter(Boolean)
      );
      const newWallets = walletRows.filter((r) => !existingWalletIds.has(String(r.wallet_pk)));

      // --- Categories ---
      let categoryRows: AnyObject[] = [];
      try {
        categoryRows = db.prepare("SELECT * FROM categories").all();
      } catch {
        warnings.push("categories table not found");
      }
      const existingCatIds = new Set(
        (await this.categoryRepo.find({ where: { accountId: account.id }, select: ["externalId"] }))
          .map((c) => c.externalId)
          .filter(Boolean)
      );
      const newCategories = categoryRows.filter((r) => !existingCatIds.has(String(r.category_pk)));

      // --- Transactions ---
      let txRows: AnyObject[] = [];
      try {
        txRows = db
          .prepare("SELECT transaction_pk, date_created, income FROM transactions WHERE (type IS NULL OR type = 0)")
          .all();
      } catch {
        warnings.push("transactions table not found");
      }
      const existingTxIds = new Set(
        (await this.transactionRepo.find({ where: { accountId: account.id }, select: ["externalId"] }))
          .map((t) => t.externalId)
          .filter(Boolean)
      );
      const newTxRows = txRows.filter((r) => !existingTxIds.has(String(r.transaction_pk)));

      // Date range
      let earliest: string | null = null;
      let latest: string | null = null;
      for (const row of txRows) {
        const d = this.unixToDate(row.date_created);
        if (d) {
          const iso = d.toISOString().slice(0, 10);
          if (!earliest || iso < earliest) earliest = iso;
          if (!latest || iso > latest) latest = iso;
        }
      }

      const previewId = randomUUID();
      const counts = {
        wallets: { total: walletRows.length, new: newWallets.length, existing: walletRows.length - newWallets.length },
        categories: { total: categoryRows.length, new: newCategories.length, existing: categoryRows.length - newCategories.length },
        transactions: { total: txRows.length, new: newTxRows.length, existing: txRows.length - newTxRows.length },
      };

      this.previewCache.set(previewId, {
        filePath,
        accountId: account.id,
        counts,
        dateRange: { earliest, latest },
        createdAt: Date.now(),
      });

      db.close();

      return {
        previewId,
        file: { name: file.originalname || "unknown", size: file.size || 0, valid: true },
        counts,
        dateRange: { earliest, latest },
        warnings,
      };
    } catch (err) {
      try { db?.close(); } catch {}
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to preview Cashew file: ${msg}`);
    }
  }

  // =========== EXECUTE with SSE ===========

  async executeImport(account: Account, previewId: string, res: Response): Promise<void> {
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

    const queryRunner = this.dataSource.createQueryRunner();
    let db: any;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      send({ stage: "starting", progress: 0, message: "Starting Cashew import..." });

      db = this.openSqlite(previewData.filePath);

      // ---- Stage 1: Wallets (0-20%) ----
      send({ stage: "wallets", progress: 5, message: "Importing wallets..." });
      const walletIdMap = await this.importWallets(account, db, queryRunner, (cur, tot) => {
        send({ stage: "wallets", progress: 5 + (cur / tot) * 15, current: cur, total: tot, message: `Wallets (${cur}/${tot})` });
      });

      // ---- Stage 2: Categories (20-50%) ----
      send({ stage: "categories", progress: 20, message: "Importing categories..." });
      const categoryIdMap = await this.importCategories(account, db, queryRunner, (cur, tot) => {
        send({ stage: "categories", progress: 20 + (cur / tot) * 30, current: cur, total: tot, message: `Categories (${cur}/${tot})` });
      });

      // ---- Stage 3: Transactions (50-100%) ----
      send({ stage: "transactions", progress: 50, message: "Importing transactions..." });
      await this.importTransactions(account, db, queryRunner, walletIdMap, categoryIdMap, (cur, tot) => {
        send({ stage: "transactions", progress: 50 + (cur / tot) * 48, current: cur, total: tot, message: `Transactions (${cur}/${tot})` });
      });

      await queryRunner.commitTransaction();

      send({ stage: "complete", progress: 100, message: "Import completed successfully!" });

      // Cleanup
      this.previewCache.delete(previewId);
      if (previewData.filePath && fs.existsSync(previewData.filePath)) {
        try { fs.unlinkSync(previewData.filePath); } catch {}
      }
    } catch (err) {
      try { await queryRunner.rollbackTransaction(); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cashew import failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      send({ stage: "error", progress: 0, message: `Import failed: ${msg}`, error: msg });
    } finally {
      try { db?.close(); } catch {}
      await queryRunner.release();
      res.end();
    }
  }

  // =========== EXECUTE (JSON response) ===========

  async executeImportDirect(account: Account, previewId: string) {
    const previewData = this.previewCache.get(previewId);
    if (!previewData) {
      throw new Error("Preview not found or expired");
    }
    if (previewData.accountId !== account.id) {
      throw new Error("Unauthorized");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    let db: any;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      db = this.openSqlite(previewData.filePath);

      const walletIdMap = await this.importWallets(account, db, queryRunner, () => {});
      const categoryIdMap = await this.importCategories(account, db, queryRunner, () => {});
      await this.importTransactions(account, db, queryRunner, walletIdMap, categoryIdMap, () => {});

      await queryRunner.commitTransaction();

      this.previewCache.delete(previewId);
      if (previewData.filePath && fs.existsSync(previewData.filePath)) {
        try { fs.unlinkSync(previewData.filePath); } catch {}
      }

      return { stage: "complete", progress: 100, message: "Import completed successfully!" };
    } catch (err) {
      try { await queryRunner.rollbackTransaction(); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cashew import failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new Error(`Import failed: ${msg}`);
    } finally {
      try { db?.close(); } catch {}
      await queryRunner.release();
    }
  }

  // =========== IMPORT METHODS ===========

  private async importWallets(
    account: Account,
    db: any,
    queryRunner: QueryRunner,
    onProgress: (cur: number, tot: number) => void
  ): Promise<Map<string, string>> {
    // Returns: cashew wallet_pk -> our wallet.id
    const idMap = new Map<string, string>();
    const manager = queryRunner.manager;

    let rows: AnyObject[] = [];
    try {
      rows = db.prepare("SELECT * FROM wallets ORDER BY \"order\" ASC").all();
    } catch {
      return idMap;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.wallet_pk);
      if (!externalId) continue;

      let wallet = await manager.findOne(FinanceWallet, {
        where: { accountId: account.id, externalId },
      });

      if (!wallet) {
        wallet = manager.create(FinanceWallet, {
          accountId: account.id,
          account,
          externalId,
          name: (row.name || "").toString().trim() || "Wallet",
          colour: row.colour || null,
          iconName: row.icon_name || null,
          currency: (row.currency || "EUR").toUpperCase(),
          order: typeof row.order === "number" ? row.order : i,
        });
        wallet = await manager.save(wallet);
      }

      idMap.set(externalId, wallet.id);
      onProgress(i + 1, rows.length);
    }

    return idMap;
  }

  private async importCategories(
    account: Account,
    db: any,
    queryRunner: QueryRunner,
    onProgress: (cur: number, tot: number) => void
  ): Promise<Map<string, string>> {
    // Returns: cashew category_pk -> our category.id
    const idMap = new Map<string, string>();
    const manager = queryRunner.manager;

    let rows: AnyObject[] = [];
    try {
      rows = db.prepare("SELECT * FROM categories ORDER BY \"order\" ASC").all();
    } catch {
      return idMap;
    }

    // First pass: create all categories (without parent links)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.category_pk);
      if (!externalId) continue;

      let category = await manager.findOne(FinanceCategory, {
        where: { accountId: account.id, externalId },
      });

      if (!category) {
        category = manager.create(FinanceCategory, {
          accountId: account.id,
          account,
          externalId,
          name: (row.name || "").toString().trim() || "Category",
          colour: row.colour || null,
          iconName: row.icon_name || null,
          isIncome: row.income === 1,
          parentCategoryId: null, // set in second pass
        });
        category = await manager.save(category);
      }

      idMap.set(externalId, category.id);
      onProgress(Math.floor((i + 1) / 2), rows.length);
    }

    // Second pass: set parent links
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.category_pk);
      if (!externalId) continue;

      const mainCategoryPk = String(row.main_category_pk);
      if (!mainCategoryPk) continue;

      const ourId = idMap.get(externalId);
      const parentId = idMap.get(mainCategoryPk);
      if (!ourId || !parentId) continue;

      await manager.update(FinanceCategory, ourId, { parentCategoryId: parentId });
      onProgress(Math.floor(rows.length / 2) + i + 1, rows.length);
    }

    return idMap;
  }

  private async importTransactions(
    account: Account,
    db: any,
    queryRunner: QueryRunner,
    walletIdMap: Map<string, string>,
    categoryIdMap: Map<string, string>,
    onProgress: (cur: number, tot: number) => void
  ): Promise<void> {
    const manager = queryRunner.manager;

    let rows: AnyObject[] = [];
    try {
      // Import normal transactions and recurring ones (type 0 or null)
      // Skip transfer "to" transactions that are paired (type = 2) which are internal
      rows = db
        .prepare(
          "SELECT * FROM transactions WHERE (type IS NULL OR type = 0 OR type = 1 OR type = 3) ORDER BY date_created ASC"
        )
        .all();
    } catch {
      return;
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.transaction_pk);
      if (!externalId) continue;

      // Check if already exists
      const existing = await manager.findOne(FinanceTransaction, {
        where: { accountId: account.id, externalId },
      });
      if (existing) {
        onProgress(i + 1, rows.length);
        continue;
      }

      const transactionDate = this.unixToDate(row.date_created) ?? new Date();
      const amount = parseFloat(row.amount) || 0;
      const categoryId = row.category_fk ? categoryIdMap.get(String(row.category_fk)) ?? null : null;
      const walletId = row.wallet_fk ? walletIdMap.get(String(row.wallet_fk)) ?? null : null;

      const tx = manager.create(FinanceTransaction, {
        accountId: account.id,
        account,
        externalId,
        name: (row.name || "").toString().trim() || "Transaction",
        amount: Math.abs(amount),
        note: row.note || null,
        categoryId,
        walletId,
        transactionDate,
        isIncome: row.income === 1,
        isPaid: row.paid === 1,
        type: row.type ?? null,
      });

      await manager.save(tx);

      if ((i + 1) % BATCH_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }
  }

  // =========== DIRECT IMPORT (no preview) ===========

  async importFromFile(account: Account, file: Express.Multer.File) {
    let filePath: string | undefined;
    let db: any;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const ext = path.extname(file.originalname || "") || ".sqlite";
      if (file.buffer?.length) {
        filePath = await this.writeBufferToTempFile(file.buffer, ext);
      } else if (file.path && fs.existsSync(file.path)) {
        filePath = file.path;
      } else {
        throw new Error("Uploaded file is empty or unavailable.");
      }

      await queryRunner.connect();
      await queryRunner.startTransaction();

      db = this.openSqlite(filePath);

      const walletIdMap = await this.importWallets(account, db, queryRunner, () => {});
      const categoryIdMap = await this.importCategories(account, db, queryRunner, () => {});
      await this.importTransactions(account, db, queryRunner, walletIdMap, categoryIdMap, () => {});

      await queryRunner.commitTransaction();
      return { status: "ok" };
    } catch (err) {
      try { await queryRunner.rollbackTransaction(); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to import Cashew file: ${msg}`);
    } finally {
      try { db?.close(); } catch {}
      await queryRunner.release();
      if (filePath && file.buffer?.length && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
  }
}
