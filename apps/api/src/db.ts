import Database from 'better-sqlite3';

export type Db = Database.Database;

export function openDb(path: string): Db {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      max_participants INTEGER NOT NULL,
      password_hash TEXT,
      state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','expired'))
    );
  `);
  return db;
}
