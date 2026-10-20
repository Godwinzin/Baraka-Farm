import db from "./db.js";
import { hashPassword } from "./auth.js";

const [username, password] = process.argv.slice(2);

if (!username || !password || password.length < 10) {
  console.error('Usage: node server/create-admin.js <username> "<password, 10+ characters>"');
  process.exit(1);
}

const hash = await hashPassword(password);

db.prepare(`
  INSERT INTO users (username, password_hash) VALUES (?, ?)
  ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
`).run(username, hash);

console.log(`Admin "${username}" saved.`);