import app from "./app.js";
import { runMigrations } from "./migrate.js";
const PORT = process.env.PORT || 3000;

await runMigrations();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});