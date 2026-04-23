import { DataSource } from "typeorm";
import { runPendingMigrations } from "./run-migrations";

describe("runPendingMigrations", () => {
  it("should initialize, migrate, and destroy an uninitialized data source", async () => {
    const dataSource = {
      isInitialized: false,
      initialize: jest.fn().mockImplementation(async function (this: any) {
        this.isInitialized = true;
      }),
      runMigrations: jest.fn().mockResolvedValue([{ name: "MigrationA" }]),
      destroy: jest.fn().mockImplementation(async function (this: any) {
        this.isInitialized = false;
      }),
    } as unknown as DataSource;

    const migrations = await runPendingMigrations(dataSource);

    expect(dataSource.initialize).toHaveBeenCalledTimes(1);
    expect(dataSource.runMigrations).toHaveBeenCalledTimes(1);
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
    expect(migrations).toEqual([{ name: "MigrationA" }]);
  });

  it("should leave an already initialized data source open after running migrations", async () => {
    const dataSource = {
      isInitialized: true,
      initialize: jest.fn(),
      runMigrations: jest.fn().mockResolvedValue([]),
      destroy: jest.fn(),
    } as unknown as DataSource;

    await runPendingMigrations(dataSource);

    expect(dataSource.initialize).not.toHaveBeenCalled();
    expect(dataSource.runMigrations).toHaveBeenCalledTimes(1);
    expect(dataSource.destroy).not.toHaveBeenCalled();
  });
});
