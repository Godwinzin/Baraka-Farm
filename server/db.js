import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Idle connections can be dropped by the database. Log it instead of crashing.
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      fname        TEXT NOT NULL,
      sname        TEXT,
      lname        TEXT NOT NULL,
      country_code TEXT NOT NULL,
      phone        TEXT NOT NULL,
      email        TEXT,
      status       TEXT NOT NULL DEFAULT 'new',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      expires_at BIGINT NOT NULL
    )
  `);
}

export default pool;