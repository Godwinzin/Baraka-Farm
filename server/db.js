import Database from "better-sqlite3";
import path from "node:path";

const dbPath = process.env.DB_PATH || path.join(import.meta.dirname, "..", "baraka.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    fname        TEXT NOT NULL,
    sname        TEXT,
    lname        TEXT NOT NULL,
    country_code TEXT NOT NULL,
    phone        TEXT NOT NULL,
    email        TEXT,
    status       TEXT NOT NULL DEFAULT 'new',
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

export default db;