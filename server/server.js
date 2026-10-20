import express from "express";
import path from "node:path";
import { validateBooking } from "./validate.js";
import cookieParser from "cookie-parser";
import db from "./db.js"; // already there
import {
  hashPassword, verifyPassword, createSession, destroySession, requireAdmin, SESSION_MS,
} from "./auth.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const insertBooking = db.prepare(`
  INSERT INTO bookings (fname, sname, lname, country_code, phone, email)
  VALUES (@fname, @sname, @lname, @countryCode, @phone, @email)
`);

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
const PORT = process.env.PORT || 3000;

// Middleware: read JSON sent in a request body
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use(express.static(path.join(import.meta.dirname, "..", "public")));

// The public form: 10 submissions per 15 minutes per visitor
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Admin routes: only FAILED attempts count, which blocks key guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed attempts. Try again later." },
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express" });
});

const findUser = db.prepare("SELECT id, password_hash FROM users WHERE username = ?");
const DUMMY_HASH = await hashPassword("not-a-real-password");

app.post("/api/login", loginLimiter, async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const user = findUser.get(username);
  const valid = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !valid) {
    return res.status(401).json({ error: "Wrong username or password" });
  }

  const token = createSession(user.id);
  res.cookie("sid", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS,
  });
  res.json({ message: "Logged in" });
});

app.post("/api/logout", (req, res) => {
  destroySession(req.cookies?.sid);
  res.clearCookie("sid");
  res.status(204).end();
});

// receive a booking
app.post("/api/bookings", bookingLimiter, (req, res) => {
  const { errors, data } = validateBooking(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const result = insertBooking.run(data);
    res.status(201).json({ message: "Booking received", id: result.lastInsertRowid });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Could not save your booking" });
  }
});


const listBookings = db.prepare(`
  SELECT id, fname, sname, lname, country_code, phone, email, status, created_at
  FROM bookings
  ORDER BY id ASC
`);

const getBooking = db.prepare(`
  SELECT id, fname, sname, lname, country_code, phone, email, status, created_at
  FROM bookings
  WHERE id = ?
`);

// All bookings, newest first
app.get("/api/bookings", requireAdmin, (req, res) => {
  res.json(listBookings.all());
});

// One booking by id
app.get("/api/bookings/:id", requireAdmin, (req, res) => {
  const booking = getBooking.get(req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.json(booking);
});

const ALLOWED_STATUSES = ["new", "contacted", "confirmed", "cancelled"];

const updateStatus = db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`);
const deleteBooking = db.prepare(`DELETE FROM bookings WHERE id = ?`);

// Update a booking's status
app.patch("/api/bookings/:id", requireAdmin, (req, res) => {
  const status = req.body?.status;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const result = updateStatus.run(status, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.json({ message: "Status updated" });
});

// Delete a booking
app.delete("/api/bookings/:id", requireAdmin, (req, res) => {
  const result = deleteBooking.run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.status(204).end();
});

// Any /api URL that matched no route
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler: Express recognises it by its FOUR parameters
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});