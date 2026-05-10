import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  try {
    await db.execute(sql`ALTER TABLE monthly_adjustments ADD COLUMN IF NOT EXISTS overridehours NUMERIC(10,2)`);
    console.log("✅ Column overridehours added (or already exists)");

    const cols = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'monthly_adjustments'
      ORDER BY ordinal_position
    `);
    console.log("Columns:", (cols.rows as any[]).map((c: any) => c.column_name).join(", "));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

main();
