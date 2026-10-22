import { test, describe, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../server/db.js";
import { hashPassword } from "../server/auth.js";
import { startTestServer } from "./helpers.js";
import { isoDate } from "./dates.js";

const ADMIN = { username: "testadmin", password: "correct-horse-battery" };
const NEW_PASSWORD = "a-brand-new-password";

let ctx;
let adminHash;

// fetch has no cookie jar, so we pass the session cookie by hand
function request(path, { method = "GET", body, cookie } = {}) {
  return fetch(`${ctx.baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(cookie && { Cookie: cookie }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function login(username = ADMIN.username, password = ADMIN.password) {
  const res = await request("/api/login", {
    method: "POST",
    body: { username, password },
  });
  const setCookie = res.headers.get("set-cookie");
  return { res, setCookie, cookie: setCookie ? setCookie.split(";")[0] : null };
}

async function listBookings(cookie, query = "") {
  const res = await request(`/api/bookings${query}`, { cookie });
  return { res, body: await res.json() };
}

async function statusOf(id) {
  const { rows } = await pool.query("SELECT status FROM bookings WHERE id = $1", [id]);
  return rows[0]?.status;
}

describe("admin API", () => {
  before(async () => {
    ctx = await startTestServer();
    adminHash = await hashPassword(ADMIN.password); // slow on purpose, so do it once
  });

  after(async () => {
    await ctx.close();
  });

  // Every test starts from the same known state
  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE bookings, sessions, users RESTART IDENTITY");
    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [ADMIN.username, adminHash]
    );
    await pool.query(
      `INSERT INTO bookings (fname, lname, country_code, phone, email, visit_date, status)
       VALUES
         ('ALICE', 'WANJIKU', '+254', '711111111', 'alice@example.com', $1, 'new'),
         ('BOB',   'OTIENO',  '+254', '722222222', NULL,                $1, 'contacted'),
         ('CAROL', 'KAMAU',   '+254', '733333333', NULL,                $1, 'new')`,
      [isoDate(10)]
    );
  });

  describe("login", () => {
    test("rejects a wrong password", async () => {
      const { res } = await login(ADMIN.username, "wrong-password-123");
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: "Wrong username or password" });
    });

    test("gives the same answer for an unknown username", async () => {
      const { res } = await login("nobody", "wrong-password-123");
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: "Wrong username or password" });
    });

    test("a correct login sets a hardened session cookie", async () => {
      const { res, setCookie } = await login();
      assert.equal(res.status, 200);
      assert.match(setCookie, /^sid=/);
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Strict/i);
    });

    test("the database stores a hash of the token, not the token itself", async () => {
      const { cookie } = await login();
      const token = cookie.split("=")[1];
      const { rows } = await pool.query("SELECT token_hash FROM sessions");
      assert.equal(rows.length, 1);
      assert.notEqual(rows[0].token_hash, token);
    });
  });

  describe("protected routes without a session", () => {
    const routes = [
      ["GET", "/api/bookings"],
      ["GET", "/api/bookings/1"],
      ["PATCH", "/api/bookings/1"],
      ["DELETE", "/api/bookings/1"],
      ["POST", "/api/change-password"],
    ];

    for (const [method, path] of routes) {
      test(`${method} ${path} returns 401`, async () => {
        const res = await request(path, { method });
        assert.equal(res.status, 401);
      });
    }
  });

  describe("listing bookings", () => {
    test("returns newest first, with paging details and plain date strings", async () => {
      const { cookie } = await login();
      const { res, body } = await listBookings(cookie);

      assert.equal(res.status, 200);
      assert.deepEqual(body.bookings.map((b) => b.id), [3, 2, 1]);
      assert.equal(body.total, 3);
      assert.equal(body.page, 1);
      assert.equal(body.totalPages, 1);
      assert.equal(body.bookings[0].visit_date, isoDate(10));
    });

    test("searches by name, ignoring case", async () => {
      const { cookie } = await login();
      const { body } = await listBookings(cookie, "?search=bob");
      assert.equal(body.total, 1);
      assert.equal(body.bookings[0].fname, "BOB");
    });

    test("filters by status", async () => {
      const { cookie } = await login();
      const { body } = await listBookings(cookie, "?status=contacted");
      assert.equal(body.total, 1);
      assert.equal(body.bookings[0].fname, "BOB");
    });

    test("treats % in a search as plain text, not a wildcard", async () => {
      const { cookie } = await login();
      const { body } = await listBookings(cookie, `?search=${encodeURIComponent("%")}`);
      assert.equal(body.total, 0);
    });

    test("caps the page size at 100", async () => {
      const { cookie } = await login();
      const { body } = await listBookings(cookie, "?pageSize=100000");
      assert.equal(body.pageSize, 100);
    });

    test("falls back to page 1 for a nonsense page number", async () => {
      const { cookie } = await login();
      const { body } = await listBookings(cookie, "?page=-5");
      assert.equal(body.page, 1);
    });

    test("pages through the results", async () => {
      const { cookie } = await login();

      const first = await listBookings(cookie, "?pageSize=2");
      assert.equal(first.body.bookings.length, 2);
      assert.equal(first.body.totalPages, 2);

      const second = await listBookings(cookie, "?pageSize=2&page=2");
      assert.equal(second.body.bookings.length, 1);
    });
  });

  describe("updating and deleting", () => {
    test("PATCH changes a booking's status", async () => {
      const { cookie } = await login();
      const res = await request("/api/bookings/1", {
        method: "PATCH",
        cookie,
        body: { status: "confirmed" },
      });
      assert.equal(res.status, 200);
      assert.equal(await statusOf(1), "confirmed");
    });

    test("PATCH rejects a status that is not on the list", async () => {
      const { cookie } = await login();
      const res = await request("/api/bookings/1", {
        method: "PATCH",
        cookie,
        body: { status: "banana" },
      });
      assert.equal(res.status, 400);
      assert.equal(await statusOf(1), "new");
    });

    test("PATCH on a booking that does not exist returns 404", async () => {
      const { cookie } = await login();
      const res = await request("/api/bookings/9999", {
        method: "PATCH",
        cookie,
        body: { status: "confirmed" },
      });
      assert.equal(res.status, 404);
    });

    test("PATCH with a non-numeric id returns 404, not a server error", async () => {
      const { cookie } = await login();
      const res = await request("/api/bookings/abc", {
        method: "PATCH",
        cookie,
        body: { status: "confirmed" },
      });
      assert.equal(res.status, 404);
    });

    test("DELETE removes the booking, and a second delete returns 404", async () => {
      const { cookie } = await login();

      const first = await request("/api/bookings/2", { method: "DELETE", cookie });
      assert.equal(first.status, 204);
      assert.equal(await statusOf(2), undefined);

      const second = await request("/api/bookings/2", { method: "DELETE", cookie });
      assert.equal(second.status, 404);
    });
  });

  describe("logout", () => {
    test("ends the session on the server", async () => {
      const { cookie } = await login();
      assert.equal((await request("/api/bookings", { cookie })).status, 200);

      const out = await request("/api/logout", { method: "POST", cookie });
      assert.equal(out.status, 204);

      assert.equal((await request("/api/bookings", { cookie })).status, 401);
    });
  });

  describe("changing the password", () => {
    test("requires the correct current password", async () => {
      const { cookie } = await login();
      const res = await request("/api/change-password", {
        method: "POST",
        cookie,
        body: { currentPassword: "not-the-password", newPassword: NEW_PASSWORD },
      });
      assert.equal(res.status, 403);
    });

    test("rejects a weak new password", async () => {
      const { cookie } = await login();
      const res = await request("/api/change-password", {
        method: "POST",
        cookie,
        body: { currentPassword: ADMIN.password, newPassword: "short" },
      });
      assert.equal(res.status, 400);
      assert.ok(Array.isArray((await res.json()).errors));
    });

    test("changes the password and logs out every other session", async () => {
      const a = await login(); // the session that will change the password
      const b = await login(); // a second session, for example another device

      const res = await request("/api/change-password", {
        method: "POST",
        cookie: a.cookie,
        body: { currentPassword: ADMIN.password, newPassword: NEW_PASSWORD },
      });
      assert.equal(res.status, 200);

      // The session that made the change survives
      assert.equal((await request("/api/bookings", { cookie: a.cookie })).status, 200);
      // The other session is gone
      assert.equal((await request("/api/bookings", { cookie: b.cookie })).status, 401);

      // The old password no longer works, the new one does
      assert.equal((await login()).res.status, 401);
      assert.equal((await login(ADMIN.username, NEW_PASSWORD)).res.status, 200);
    });
  });
});