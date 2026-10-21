import pg from "pg";


pg.types.setTypeParser(1082, (value) => value); // 1082 = the DATE type; keep it as "YYYY-MM-DD"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Idle connections can be dropped by the database. Log it instead of crashing.
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});


export default pool;