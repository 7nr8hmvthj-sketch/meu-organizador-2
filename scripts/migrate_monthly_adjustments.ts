import { sql } from "drizzle-orm";

// Use the same db connection as the app
async function migrate() {
  // Dynamic import to use the app's db module
  const { getDb } = await import("../server/db");
  const db = await getDb();
  if (!db) {
    console.error("❌ Could not connect to database");
    process.exit(1);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS monthly_adjustments (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        rhhourszn NUMERIC(10, 2),
        rhhourshc NUMERIC(10, 2),
        updatedat TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(userid, month, year)
      )
    `);
    console.log("✅ Table monthly_adjustments created successfully");

    // Verify
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_adjustments' 
      ORDER BY ordinal_position
    `);
    console.log("Columns:", result.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(", "));

  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
  process.exit(0);
}

migrate();
