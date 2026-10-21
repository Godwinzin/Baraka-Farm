import assert from "node:assert/strict";
import app from "../server/app.js";
import pool, { initDb } from "../server/db.js";

// Safety: these helpers wipe tables. Refuse to run outside the test setup.
assert.equal(process.env.NODE_ENV, "test", "Run tests with npm test");

export async function resetDatabase() {
  await pool.query("TRUNCATE TABLE bookings, sessions, users RESTART IDENTITY");
}

export async function startTestServer() {
  await initDb();
  await resetDatabase();

  const server = app.listen(0); // port 0 = let the OS pick a free port
  await new Promise((resolve) => server.once("listening", resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    },
  };
}