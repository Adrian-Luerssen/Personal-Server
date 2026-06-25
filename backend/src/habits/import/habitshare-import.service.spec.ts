import { HabitShareImportService } from "./habitshare-import.service";
import { SyncOperation } from "../../sync/sync-event.entity";

describe("HabitShareImportService", () => {
  const account = { id: "account-1" } as any;

  function makeService(syncService?: { recordEvent: jest.Mock }) {
    const habitRepo = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: `habit-${entity.name}`, ...entity })),
    };
    const entryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
      upsert: jest.fn(async () => ({})),
    };
    const service = new (HabitShareImportService as any)(
      habitRepo as any,
      entryRepo as any,
      syncService
    ) as HabitShareImportService;
    return { service, habitRepo, entryRepo };
  }

  it("persists HabitShare entries with bulk upserts instead of one query per row", async () => {
    const { service, habitRepo, entryRepo } = makeService();
    const csv = [
      "Habit,Date,Status,Comment",
      ...Array.from({ length: 75 }, (_, i) => {
        const day = String((i % 28) + 1).padStart(2, "0");
        return `Water,2026-01-${day},success,`;
      }),
    ].join("\n");

    habitRepo.find.mockResolvedValue([]);
    entryRepo.find.mockResolvedValue([]);

    const preview = await service.previewImport(account, {
      buffer: Buffer.from(csv, "utf-8"),
      originalname: "HabitShareData.csv",
      size: Buffer.byteLength(csv),
    } as any);

    await service.executeImport(account, preview.previewId);

    expect(entryRepo.findOne).not.toHaveBeenCalled();
    expect(entryRepo.save).not.toHaveBeenCalled();
    expect(entryRepo.upsert).toHaveBeenCalled();
    const [upsertRows, conflictPaths] = (entryRepo.upsert as jest.Mock).mock.calls[0];
    expect(upsertRows).toHaveLength(28);
    expect(conflictPaths).toEqual(["habitId", "date"]);
  });

  it("records a habit-entry sync watermark after persisted HabitShare changes", async () => {
    const syncService = { recordEvent: jest.fn(async () => ({})) };
    const { service, habitRepo, entryRepo } = makeService(syncService);
    const csv = [
      "Habit,Date,Status,Comment",
      "Water,2026-01-01,success,",
    ].join("\n");

    habitRepo.find.mockResolvedValue([]);
    entryRepo.find.mockResolvedValue([]);

    const preview = await service.previewImport(account, {
      buffer: Buffer.from(csv, "utf-8"),
      originalname: "HabitShareData.csv",
      size: Buffer.byteLength(csv),
    } as any);

    await service.executeImport(account, preview.previewId);

    expect(syncService.recordEvent).toHaveBeenCalledTimes(1);
    expect(syncService.recordEvent).toHaveBeenCalledWith(
      account.id,
      expect.objectContaining({
        entityType: "habit-entry",
        operation: SyncOperation.UPSERT,
        payload: expect.objectContaining({
          source: "habitshare-import",
          entries: { created: 1, existing: 0 },
          habits: { created: 1, existing: 0 },
        }),
      })
    );
  });
});
