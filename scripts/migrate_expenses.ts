import { sql } from "drizzle-orm";

async function migrateExpenses() {
  // Dynamic import to use the same DB connection as the app
  const { getDb } = await import("../server/db");
  const db = await getDb();
  
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("Creating category enum if not exists...");
  try {
    await db.execute(sql`DO $$ BEGIN CREATE TYPE category AS ENUM ('fixed', 'variable'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    console.log("✓ Category enum ready");
  } catch (e: any) {
    console.log("Category enum already exists or created:", e.message);
  }

  console.log("Creating expenses table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        dueday INTEGER NOT NULL,
        category category NOT NULL DEFAULT 'fixed',
        ispaid BOOLEAN NOT NULL DEFAULT false,
        paidmonth INTEGER,
        paidyear INTEGER,
        createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Expenses table created");
  } catch (e: any) {
    console.log("Expenses table error:", e.message);
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrateExpenses();
