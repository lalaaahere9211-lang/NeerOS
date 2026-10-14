import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SEED_DATA_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('neeros.db');
    // Enable Write-Ahead Logging (WAL) for concurrent read performance
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Execute schema migrations
    await db.execAsync(SCHEMA_SQL);

    // Seed initial data if business profile doesn't exist
    const profile = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM business_profiles WHERE id = ?;',
      ['bp_patil_brothers']
    );

    if (!profile) {
      await db.execAsync(SEED_DATA_SQL);
    }

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

/**
 * Helper to run queries inside an atomic transaction
 */
export async function withTransaction<T>(
  action: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await action(db);
  });
  return result;
}
