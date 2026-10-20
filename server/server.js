import express from "express";
import path from "node:path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pool, { initDb } from "./db.js";
import { validateBooking } from "./validate.js";
import {
  hashPassword, verifyPassword, createSession, destroySession, requireAdmin, SESSION_MS,
} from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, "..", "public")));

// ---------- Rate limiters ----------
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed attempts. Try again later." },
});

// ---------- Helpers ----------
const ALLOWED_STATUSES = ["new", "contacted", "confirmed", "cancelled"];
const DUMMY_HASH = await hashPassword("not-a-real-password");

// Postgres throws an error if an INTEGER column is compared to "abc",
// so we check that an id looks like a number before using it.
function parseId(value) {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

const BOOKING_COLUMNS =
  "id, fname, sname, lname, country_code, phone, email, status, created_at";

// ---------- Auth routes ----------
app.post("/api/login", loginLimiter, async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const { rows } = await pool.query(
    "SELECT id, password_hash FROM users WHERE username = $1",
    [username]
  );
  const user = rows[0];

  const valid = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !valid) {
    return res.status(401).json({ error: "Wrong username or password" });
  }

  const token = await createSession(user.id);
  res.cookie("sid", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS,
  });
  res.json({ message: "Logged in" });
});

app.post("/api/logout", async (req, res) => {
  await destroySession(req.cookies?.sid);
  res.clearCookie("sid");
  res.status(204).end();
});

// ---------- Booking routes ----------
app.post("/api/bookings", bookingLimiter, async (req, res) => {
  const { errors, data } = validateBooking(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { rows } = await pool.query(
    `INSERT INTO bookings (fname, sname, lname, country_code, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.fname, data.sname, data.lname, data.countryCode, data.phone, data.email]
  );

  res.status(201).json({ message: "Booking received", id: rows[0].id });
});

app.get("/api/bookings", requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY id DESC`
  );
  res.json(rows);
});

app.get("/api/bookings/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Booking not found" });

  const { rows } = await pool.query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.json(rows[0]);
});

app.patch("/api/bookings/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Booking not found" });

  const status = req.body?.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const result = await pool.query(
    "UPDATE bookings SET status = $1 WHERE id = $2",
    [status, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.json({ message: "Status updated" });
});

app.delete("/api/bookings/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Booking not found" });

  const result = await pool.query("DELETE FROM bookings WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.status(204).end();
});

// ---------- Fallbacks ----------
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

await initDb();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});