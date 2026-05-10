import { getDb } from "../server/db";
import { monthlyAdjustments } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); process.exit(1); }

  const rows = await db.select().from(monthlyAdjustments).limit(20);
  console.log("All adjustments:", JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(console.error);
