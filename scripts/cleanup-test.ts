import { getDb } from "../server/db";
import { monthlyAdjustments } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { process.exit(1); }

  // Remove o registro de teste (id=8)
  await db.execute(sql`DELETE FROM monthly_adjustments WHERE id = 8`);
  console.log("✅ Test record cleaned up");
  process.exit(0);
}

main().catch(console.error);
