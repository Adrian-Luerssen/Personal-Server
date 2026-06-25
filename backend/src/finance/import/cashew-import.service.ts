import { Injectable, Logger, Optional } from "@nestjs/common";
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
import { createImportProgressSender } from "../../utils/sse";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";

type AnyObject = Record<string, any>;

const PREVIEW_TTL_MS = 30 * 60 * 1000;
const BULK_INSERT_CHUNK_SIZE = 500;

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
    private readonly dataSource: DataSource,
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
    // Cashew stores seconds; convert to milliseconds for JS Date
    return new Date(n < 1e12 ? n * 1000 : n);
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
          .prepare("SELECT transaction_pk, date_created, income FROM transactions WHERE (type IS NULL OR type = 0 OR type = 1 OR type = 3)")
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
      await this.recordImportSync(account.id, "cashew-import", previewData.counts);

      send({
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        summary: {
          wallets: {
            created: previewData.counts.wallets.new,
            existing: previewData.counts.wallets.existing,
          },
          categories: {
            created: previewData.counts.categories.new,
            existing: previewData.counts.categories.existing,
          },
          transactions: {
            created: previewData.counts.transactions.new,
            existing: previewData.counts.transactions.existing,
          },
        },
      });

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

      const walletsBefore = await queryRunner.manager.count(FinanceWallet, { where: { accountId: account.id } });
      const categoriesBefore = await queryRunner.manager.count(FinanceCategory, { where: { accountId: account.id } });
      const transactionsBefore = await queryRunner.manager.count(FinanceTransaction, { where: { accountId: account.id } });

      const walletIdMap = await this.importWallets(account, db, queryRunner, () => {});
      const categoryIdMap = await this.importCategories(account, db, queryRunner, () => {});
      await this.importTransactions(account, db, queryRunner, walletIdMap, categoryIdMap, () => {});

      const walletsAfter = await queryRunner.manager.count(FinanceWallet, { where: { accountId: account.id } });
      const categoriesAfter = await queryRunner.manager.count(FinanceCategory, { where: { accountId: account.id } });
      const transactionsAfter = await queryRunner.manager.count(FinanceTransaction, { where: { accountId: account.id } });

      await queryRunner.commitTransaction();

      this.previewCache.delete(previewId);
      if (previewData.filePath && fs.existsSync(previewData.filePath)) {
        try { fs.unlinkSync(previewData.filePath); } catch {}
      }

      const result = {
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
        wallets: {
          created: walletsAfter - walletsBefore,
          existing: walletsBefore,
        },
        categories: {
          created: categoriesAfter - categoriesBefore,
          existing: categoriesBefore,
        },
        transactions: {
          created: transactionsAfter - transactionsBefore,
          existing: transactionsBefore,
        },
      };
      await this.recordImportSync(account.id, "cashew-import", previewData.counts);
      return result;
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

    const existingWallets = await manager.find(FinanceWallet, {
      where: { accountId: account.id },
      select: ["id", "externalId"],
    });
    const walletByExternalId = new Map(
      existingWallets
        .filter((wallet) => wallet.externalId)
        .map((wallet) => [wallet.externalId!, wallet])
    );
    const walletsToInsert: FinanceWallet[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.wallet_pk);
      if (!externalId) continue;

      const wallet = walletByExternalId.get(externalId);
      if (!wallet) {
        const id = randomUUID();
        const newWallet = manager.create(FinanceWallet, {
          id,
          accountId: account.id,
          account,
          externalId,
          name: (row.name || "").toString().trim() || "Wallet",
          colour: row.colour || null,
          iconName: row.icon_name || null,
          currency: (row.currency || "EUR").toUpperCase(),
          order: typeof row.order === "number" ? row.order : i,
        });
        walletsToInsert.push(newWallet);
        idMap.set(externalId, id);
      } else {
        idMap.set(externalId, wallet.id);
      }

      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }

    await this.insertInChunks(manager, FinanceWallet, walletsToInsert);
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

    const existingCategories = await manager.find(FinanceCategory, {
      where: { accountId: account.id },
      select: ["id", "externalId"],
    });
    const categoryByExternalId = new Map(
      existingCategories
        .filter((category) => category.externalId)
        .map((category) => [category.externalId!, category])
    );
    const categoriesToInsert: FinanceCategory[] = [];

    const totalProgressUnits = Math.max(rows.length * 2, 1);

    // First pass: create all categories (without parent links)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.category_pk);
      if (!externalId) continue;

      const category = categoryByExternalId.get(externalId);
      if (!category) {
        const id = randomUUID();
        const newCategory = manager.create(FinanceCategory, {
          id,
          accountId: account.id,
          account,
          externalId,
          name: (row.name || "").toString().trim() || "Category",
          colour: row.colour || null,
          iconName: row.icon_name || null,
          isIncome: row.income === 1,
          parentCategoryId: null, // set in second pass
        });
        categoriesToInsert.push(newCategory);
        idMap.set(externalId, id);
      } else {
        idMap.set(externalId, category.id);
      }

      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, totalProgressUnits);
      }
    }

    await this.insertInChunks(manager, FinanceCategory, categoriesToInsert);

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
      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(rows.length + i + 1, totalProgressUnits);
      }
    }

    onProgress(totalProgressUnits, totalProgressUnits);

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

    const existingTransactions = await manager.find(FinanceTransaction, {
      where: { accountId: account.id },
      select: ["externalId"],
    });
    const existingExternalIds = new Set(
      existingTransactions
        .map((tx) => tx.externalId)
        .filter((externalId): externalId is string => Boolean(externalId))
    );
    const transactionsToInsert: FinanceTransaction[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const externalId = String(row.transaction_pk);
      if (!externalId) continue;

      if (existingExternalIds.has(externalId)) {
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

      transactionsToInsert.push(tx);

      if ((i + 1) % BULK_INSERT_CHUNK_SIZE === 0 || i + 1 === rows.length) {
        onProgress(i + 1, rows.length);
      }
    }

    await this.insertInChunks(manager, FinanceTransaction, transactionsToInsert);
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
      await this.recordImportSync(account.id, "cashew-import");
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

  private async recordImportSync(
    accountId: string,
    source: string,
    counts?: CashewPreviewData["counts"]
  ): Promise<void> {
    if (!this.syncService) return;
    if (
      counts &&
      counts.wallets.new === 0 &&
      counts.categories.new === 0 &&
      counts.transactions.new === 0
    ) {
      return;
    }

    await this.syncService.recordEvent(accountId, {
      entityType: "finance-transaction",
      entityId: randomUUID(),
      operation: SyncOperation.UPSERT,
      payload: { source, counts: counts ?? null },
    });
  }
}
