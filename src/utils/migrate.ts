import { promises as fs } from "fs";
import {
  Migrator,
  FileMigrationProvider,
  MigrationResultSet,
  NO_MIGRATIONS,
} from "kysely";
import db from "../config/db";
import path from "path";

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs: fs,
    path: path,
    migrationFolder: path.join(__dirname, "../migrations"),
  }),
});

export async function migrate(direction: string) {
  let migrationResult: MigrationResultSet | undefined = undefined;
  if (direction === "up") {
    migrationResult = await migrator.migrateToLatest();
  } else if (direction === "rollback") {
    migrationResult = await migrator.migrateTo(NO_MIGRATIONS);
  }
  if (migrationResult) {
    serveMigration(migrationResult);
  } else {
    console.log('Invalid migration direction. Use "up"(default) or "rollback"');
  }
}

function serveMigration(migrationResult: MigrationResultSet) {
  const { error, results } = migrationResult;
  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`Migration ${it.migrationName} executed successfully`);
    } else if (it.status === "Error") {
      console.error(`Failed to execute migration ${it.migrationName}`);
    }
  });
  if (error) {
    console.error("Failed to migrate", error);
    process.exit(1);
  }
}

if (require.main === module) {
  const direction = process.argv[2] ?? "up";
  migrate(direction);
  process.exit(0);
}
