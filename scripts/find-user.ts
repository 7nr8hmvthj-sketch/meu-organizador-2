import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const result = await db.execute(
    sql.raw(`SELECT id, username, role, created_at FROM app_users WHERE LOWER(username) LIKE '%emanuela%' OR LOWER(username) LIKE '%diemer%' LIMIT 10`)
  );
  console.log("User found:", JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
