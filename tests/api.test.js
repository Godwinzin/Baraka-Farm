import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../server/db.js";
import { startTestServer } from "./helpers.js";
import { isoDate } from "./dates.js";

const validBooking = {
  fname: "john",
  lname: "smith",
  countryCode: "+254",
  phone: "712345678",
  visitDate: isoDate(7),
};

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("public API", () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await ctx.close();
  });

  test("listing bookings without logging in returns 401", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/bookings`);
    assert.equal(res.status, 401);
  });

  test("an unknown API route returns a JSON 404", async () => {
    const res = await fetch(`${ctx.baseUrl}/api/nothing-here`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  test("broken JSON returns 400", async () => {
    const res = await postJson(`${ctx.baseUrl}/api/bookings`, "{not json");
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: "Invalid JSON" });
  });

  test("an invalid booking returns 400 with a list of errors", async () => {
    const res = await postJson(`${ctx.baseUrl}/api/bookings`, {
      fname: "",
      lname: 123,
      phone: "abc",
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length > 0);
  });

  test("a valid booking returns 201 and is saved in the database", async () => {
    const res = await postJson(`${ctx.baseUrl}/api/bookings`, validBooking);
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.equal(typeof body.id, "number");

    const { rows } = await pool.query(
      "SELECT fname, lname, status, visit_date FROM bookings WHERE id = $1",
      [body.id]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].fname, "JOHN");
    assert.equal(rows[0].status, "new");
    assert.equal(rows[0].visit_date, validBooking.visitDate);
  });

  test("a filled honeypot field pretends to succeed but saves nothing", async () => {
  const before = await pool.query("SELECT count(*)::int AS n FROM bookings");

  const res = await postJson(`${ctx.baseUrl}/api/bookings`, {
    ...validBooking,
    website: "http://spam.example",
  });
  assert.equal(res.status, 201);

  const after = await pool.query("SELECT count(*)::int AS n FROM bookings");
  assert.equal(after.rows[0].n, before.rows[0].n);
});
});