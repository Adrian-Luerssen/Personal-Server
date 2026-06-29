import { CashewImportService } from "./cashew-import.service";
import { FinanceTransaction } from "../entities/transaction.entity";

describe("CashewImportService", () => {
  const account = { id: "account-1" } as any;

  function makeService(overrides: { cacheManager?: any; syncService?: any } = {}) {
    return new CashewImportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      overrides.cacheManager ?? ({ reset: jest.fn(async () => undefined) } as any),
      overrides.syncService
    );
  }

  it("imports Cashew transactions with a preload and bulk insert instead of one lookup per row", async () => {
    const service = makeService();
    const rows = Array.from({ length: 75 }, (_, i) => ({
      transaction_pk: `tx-${i + 1}`,
      date_created: 1_704_067_200 + i * 86_400,
      amount: i + 1,
      income: i % 5 === 0 ? 1 : 0,
      paid: 1,
      type: 0,
      name: `Transaction ${i + 1}`,
      note: "",
      wallet_fk: "wallet-1",
      category_fk: "category-1",
    }));
    const manager = {
      find: jest.fn(async () => [{ externalId: "tx-1" }]),
      findOne: jest.fn(async () => undefined),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (entity) => entity),
      insert: jest.fn(async () => ({})),
    };
    const queryRunner = { manager };
    const db = {
      prepare: jest.fn(() => ({
        all: () => rows,
      })),
    };

    await (service as any).importTransactions(
      account,
      db,
      queryRunner,
      new Map([["wallet-1", "wallet-id-1"]]),
      new Map([["category-1", "category-id-1"]]),
      jest.fn()
    );

    expect(manager.find).toHaveBeenCalledWith(
      FinanceTransaction,
      expect.objectContaining({
        where: { accountId: account.id },
        select: ["externalId"],
      })
    );
    expect(manager.findOne).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.insert).toHaveBeenCalledWith(
      FinanceTransaction,
      expect.arrayContaining([
        expect.objectContaining({ externalId: "tx-2" }),
      ])
    );
    const insertedRows = (manager.insert as jest.Mock).mock.calls.flatMap(
      (call) => call[1]
    );
    expect(insertedRows).toHaveLength(74);
  });

  it("reports category progress across both create and parent-link passes without exceeding the total", async () => {
    const service = makeService();
    const rows = [
      { category_pk: "cat-1", main_category_pk: null, name: "Food", income: 0 },
      { category_pk: "cat-2", main_category_pk: "cat-1", name: "Groceries", income: 0 },
    ];
    const manager = {
      find: jest.fn(async () => []),
      create: jest.fn((_entity, data) => data),
      insert: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    };
    const db = {
      prepare: jest.fn(() => ({
        all: () => rows,
      })),
    };
    const progress: Array<[number, number]> = [];

    await (service as any).importCategories(
      account,
      db,
      { manager },
      (current: number, total: number) => progress.push([current, total])
    );

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toEqual([4, 4]);
    expect(progress.every(([current, total]) => current <= total)).toBe(true);
  });

  it("clears cached finance/dashboard responses after a successful import commit", async () => {
    const cacheManager = { reset: jest.fn(async () => undefined) };
    const syncService = { recordEvent: jest.fn(async () => ({})) };
    const service = makeService({ cacheManager, syncService });

    await (service as any).finalizeImportMutation(account.id, "cashew-import", {
      wallets: { total: 1, new: 1, existing: 0 },
      categories: { total: 1, new: 1, existing: 0 },
      transactions: { total: 10, new: 10, existing: 0 },
    });

    expect(cacheManager.reset).toHaveBeenCalledTimes(1);
    expect(syncService.recordEvent).toHaveBeenCalledWith(
      account.id,
      expect.objectContaining({
        entityType: "finance-transaction",
        operation: "upsert",
      })
    );
  });
});
