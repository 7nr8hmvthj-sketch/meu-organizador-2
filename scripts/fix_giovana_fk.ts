import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  // 1. Check the actual structure of the users table
  console.log("=== Checking users table structure ===");
  try {
    const result = await db.execute(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
    console.log("Users table columns:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Error checking users table:", err.message);
  }

  // 2. Check existing users
  console.log("\n=== Existing users in users table ===");
  try {
    const result = await db.execute(`SELECT * FROM users LIMIT 10`);
    console.log("Users:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Error reading users:", err.message);
  }

  // 3. Check events table userid column
  console.log("\n=== Events table userid column info ===");
  try {
    const result = await db.execute(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'userid'`);
    console.log("Events userid:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // 4. Check if there's a FK constraint on events.userid
  console.log("\n=== FK constraints on events ===");
  try {
    const result = await db.execute(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'events'::regclass AND contype = 'f'
    `);
    console.log("FK:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("No FK or error:", err.message);
  }

  // 5. Try inserting a test event for userId 3 to see the exact error
  console.log("\n=== Test insert event for userId 3 ===");
  try {
    const result = await db.execute(`INSERT INTO events (userid, date, type, isshift) VALUES (3, '2026-05-01', 'TEST', true) RETURNING id`);
    console.log("Insert success:", JSON.stringify(result, null, 2));
    // Clean up test
    await db.execute(`DELETE FROM events WHERE type = 'TEST' AND userid = 3`);
    console.log("Test cleaned up");
  } catch (err: any) {
    console.error("Insert failed:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
