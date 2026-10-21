import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Idle connections can be dropped by the database. Log it instead of crashing.
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});


export default pool;