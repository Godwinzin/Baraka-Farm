import app from "./app.js";
import { initDb } from "./db.js";

const PORT = process.env.PORT || 3000;

await initDb();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Database host:", new URL(process.env.DATABASE_URL).host);
});