import { FitNotesImportService } from "./fitnotes-import.service";
import { WorkoutExercise } from "../exercises/exercise.entity";
import { WorkoutSession } from "../sessions/session.entity";
import { WorkoutSet } from "../sets/set.entity";
import { BodyWeightEntry } from "../bodyweight/bodyweight.entity";

describe("FitNotesImportService", () => {
  const account = { id: "account-1" } as any;

  function makeService() {
    return new FitNotesImportService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  }

  it("imports FitNotes sets in bulk instead of checking each imported set individually", async () => {
    const service = makeService();
    const rows = Array.from({ length: 75 }, (_, i) => ({
      _id: i + 1,
      date: "2026-01-01",
      exercise_id: 1,
      reps: 8,
      metric_weight: 60 + i,
      distance: null,
      duration_seconds: null,
    }));
    const manager = {
      find: jest.fn(async (entity) => {
        if (entity === WorkoutExercise) {
          return [{ id: "exercise-id-1", name: "Bench Press" }];
        }
        return [];
      }),
      findOne: jest.fn(async (entity) => {
        if (entity === WorkoutSession) return undefined;
        return undefined;
      }),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (entity) => ({ id: "session-id-1", ...entity })),
      insert: jest.fn(async () => ({})),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ max: null })),
      })),
    };
    const queryRunner = { manager };
    const db = {
      prepare: jest.fn((sql: string) => ({
        all: () => {
          if (sql.includes("SELECT _id, name FROM exercise")) {
            return [{ _id: 1, name: "Bench Press" }];
          }
          if (sql.includes("SELECT * FROM training_log")) return rows;
          if (sql.includes("SELECT * FROM workout")) return [];
          return [];
        },
      })),
    };

    await (service as any).importWorkoutsAndSetsWithRunner(
      account,
      db,
      ["exercise", "training_log"],
      queryRunner,
      jest.fn()
    );

    const setFindOneCalls = manager.findOne.mock.calls.filter(
      ([entity]) => entity === WorkoutSet
    );
    expect(setFindOneCalls).toHaveLength(0);
    expect(manager.insert).toHaveBeenCalledWith(
      WorkoutSet,
      expect.arrayContaining([
        expect.objectContaining({ sessionId: expect.any(String) }),
      ])
    );
    const insertedSetRows = (manager.insert as jest.Mock).mock.calls
      .filter(([entity]) => entity === WorkoutSet)
      .flatMap((call) => call[1]);
    expect(insertedSetRows).toHaveLength(75);
  });

  it("deduplicates bodyweight measurements by account and date before upserting", async () => {
    const service = makeService();
    const manager = {
      find: jest.fn(async () => []),
      upsert: jest.fn(async () => ({})),
    };
    const queryRunner = { manager };
    const db = {
      prepare: jest.fn(() => ({
        all: () => [
          { date: "2026-07-18 08:00:00", body_weight_metric: 80, comments: "morning" },
          { date: "2026-07-18 20:00:00", body_weight_metric: 79.4, comments: "evening" },
        ],
      })),
    };

    await (service as any).importBodyWeightWithRunner(
      account,
      db,
      ["BodyWeight"],
      queryRunner,
      jest.fn(),
    );

    expect(manager.upsert).toHaveBeenCalledTimes(1);
    expect(manager.upsert).toHaveBeenCalledWith(
      BodyWeightEntry,
      [{
        accountId: account.id,
        account,
        date: "2026-07-18",
        weightKg: 79.4,
        note: "evening",
      }],
      ["accountId", "date"],
    );
  });
});
