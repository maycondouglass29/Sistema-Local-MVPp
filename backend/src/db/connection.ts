import fs from 'fs';
import path from 'path';

export interface SqlDatabase {
  run(sql: string, ...params: any[]): void;
  exec(sql: string): void;
  query<T = any>(sql: string): {
    all(...params: any[]): T[];
    get(...params: any[]): T | undefined;
  };
  transaction<T>(fn: () => T): () => T;
  close(): void;
}

let dbInstance: SqlDatabase | null = null;

export function getDatabasePath(): string {
  // In test environments, use in-memory database to avoid cross-test pollution
  if (process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test') {
    return ':memory:';
  }
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'escola_local.db');
}

/** Reset the singleton — call after db.close() in test teardown */
export function resetDatabaseInstance(): void {
  dbInstance = null;
}

export function initDatabase(): SqlDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();

  // 1. Bun native sqlite
  // @ts-ignore
  if (typeof Bun !== 'undefined') {
    // @ts-ignore
    const { Database } = require('bun:sqlite');
    const nativeDb = new Database(dbPath);
    nativeDb.exec('PRAGMA journal_mode = WAL;');
    nativeDb.exec('PRAGMA foreign_keys = ON;');
    nativeDb.exec('PRAGMA synchronous = NORMAL;');

    dbInstance = {
      run(sql: string, ...params: any[]) {
        const stmt = nativeDb.prepare(sql);
        stmt.run(...params);
      },
      exec(sql: string) {
        nativeDb.exec(sql);
      },
      query<T = any>(sql: string) {
        const stmt = nativeDb.prepare(sql);
        return {
          all(...params: any[]): T[] {
            return stmt.all(...params) as T[];
          },
          get(...params: any[]): T | undefined {
            return stmt.get(...params) as T | undefined;
          },
        };
      },
      transaction<T>(fn: () => T) {
        return nativeDb.transaction(fn);
      },
      close() {
        nativeDb.close();
        dbInstance = null;
      },
    };
  } else {
    // 2. Node.js 22 / Electron native sqlite (node:sqlite, zero C++ compilation)
    const { DatabaseSync } = require('node:sqlite');
    const nativeDb = new DatabaseSync(dbPath);
    nativeDb.exec('PRAGMA journal_mode = WAL;');
    nativeDb.exec('PRAGMA foreign_keys = ON;');
    nativeDb.exec('PRAGMA synchronous = NORMAL;');

    dbInstance = {
      run(sql: string, ...params: any[]) {
        nativeDb.prepare(sql).run(...params);
      },
      exec(sql: string) {
        nativeDb.exec(sql);
      },
      query<T = any>(sql: string) {
        const stmt = nativeDb.prepare(sql);
        return {
          all(...params: any[]): T[] {
            return stmt.all(...params) as T[];
          },
          get(...params: any[]): T | undefined {
            return stmt.get(...params) as T | undefined;
          },
        };
      },
      transaction<T>(fn: () => T) {
        return () => {
          nativeDb.exec('BEGIN TRANSACTION;');
          try {
            const res = fn();
            nativeDb.exec('COMMIT;');
            return res;
          } catch (err) {
            nativeDb.exec('ROLLBACK;');
            throw err;
          }
        };
      },
      close() {
        nativeDb.close();
        dbInstance = null;
      },
    };
  }

  // Run initial schema
  runMigrations(dbInstance);

  return dbInstance;
}

function runMigrations(db: SqlDatabase) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    try {
      db.exec(schemaSql);
    } catch (err: any) {
      console.error('Migration error:', err);
    }
  }
}
