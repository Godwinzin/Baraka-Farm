import pool, { initDb } from "./db.js";

await initDb();

const { rows } = await pool.query("SELECT now() AS time");
console.log("Connected! Database time:", rows[0].time);

const tables = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
);
console.log("Tables:", tables.rows.map((r) => r.table_name));

await pool.end();