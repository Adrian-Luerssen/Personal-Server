import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AppDataSource } from "./dataSource";

export async function runPendingMigrations(
  dataSource: DataSource = AppDataSource
) {
  const shouldDestroy = !dataSource.isInitialized;

  if (shouldDestroy) {
    await dataSource.initialize();
  }

  try {
    return await dataSource.runMigrations();
  } finally {
    if (shouldDestroy && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  runPendingMigrations()
    .then((migrations) => {
      Logger.log(
        `Applied ${migrations.length} pending migrations`,
        "Migrations"
      );
    })
    .catch((error) => {
      Logger.error(
        `Failed to run pending migrations: ${error.message}`,
        error.stack,
        "Migrations"
      );
      process.exit(1);
    });
}
