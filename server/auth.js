import crypto from "node:crypto";
import { promisify } from "node:util";
import pool from "./db.js";

const scrypt = promisify(crypto.scrypt);

export const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ---------- Passwords ----------
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(":");
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- Sessions ----------
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

export async function createSession(userId) {
  await pool.query("DELETE FROM sessions WHERE expires_at <= $1", [Date.now()]);

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [sha(token), userId, Date.now() + SESSION_MS]
  );
  return token; // only the browser holds this; the database keeps its hash
}

export async function destroySession(token) {
  if (typeof token === "string") {
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [sha(token)]);
  }
}

// ---------- Middleware ----------
export async function requireAdmin(req, res, next) {
  const token = req.cookies?.sid;

  if (typeof token === "string") {
    const { rows } = await pool.query(
      "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > $2",
      [sha(token), Date.now()]
    );

    if (rows.length > 0) {
      req.userId = rows[0].user_id; // NEW: pass the identity forward
      return next();
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}

// NEW: log out every session of this user except the one making the request
export async function destroyOtherSessions(userId, currentToken) {
  await pool.query(
    "DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2",
    [userId, sha(currentToken)]
  );
}