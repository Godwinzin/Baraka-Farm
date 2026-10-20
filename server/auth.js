import crypto from "node:crypto";
import { promisify } from "node:util";
import db from "./db.js";

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

const insertSession = db.prepare(
  "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
);
const findSession = db.prepare(
  "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?"
);
const deleteSession = db.prepare("DELETE FROM sessions WHERE token_hash = ?");
const purgeExpired = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");

export function createSession(userId) {
  purgeExpired.run(Date.now());
  const token = crypto.randomBytes(32).toString("hex");
  insertSession.run(sha(token), userId, Date.now() + SESSION_MS);
  return token; // only the browser holds this; the database keeps its hash
}

export function destroySession(token) {
  if (typeof token === "string") deleteSession.run(sha(token));
}

// ---------- Middleware ----------
export function requireAdmin(req, res, next) {
  const token = req.cookies?.sid;

  if (typeof token !== "string" || !findSession.get(sha(token), Date.now())) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}