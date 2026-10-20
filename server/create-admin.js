import pool, { initDb } from "./db.js";
import { hashPassword } from "./auth.js";

const [username, password] = process.argv.slice(2);

if (!username || !password || password.length < 10) {
  console.error('Usage: node server/create-admin.js <username> "<password, 10+ characters>"');
  process.exit(1);
}

await initDb();

const hash = await hashPassword(password);

await pool.query(
  `INSERT INTO users (username, password_hash) VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [username, hash]
);

console.log(`Admin "${username}" saved.`);
await pool.end();