import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  // Insert GIOVANA into the users table (to satisfy FK constraint)
  console.log("=== Inserting GIOVANA into users table ===");
  try {
    await db.execute(`
      INSERT INTO users (id, openid, name, email, loginmethod, role, createdat, updatedat, lastsignedin)
      VALUES (3, 'giovana-local', 'GIOVANA', 'giovana@local.com', 'local', 'admin', NOW(), NOW(), NOW())
    `);
    console.log("✅ GIOVANA inserted into users table (id=3)");
  } catch (err: any) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.message?.includes('already exists')) {
      console.log("GIOVANA already exists in users table");
    } else {
      console.error("Error:", err.message);
    }
  }

  // Verify
  console.log("\n=== Verifying ===");
  const result = await db.execute(`SELECT id, name, role FROM users WHERE id = 3`);
  console.log("GIOVANA in users:", JSON.stringify(result, null, 2));

  // Test insert event for userId 3
  console.log("\n=== Test insert event for userId 3 ===");
  try {
    await db.execute(`INSERT INTO events (userid, date, type, isshift) VALUES (3, '2026-05-01', 'TEST-FK', true)`);
    console.log("✅ Event insert for userId 3 WORKS!");
    await db.execute(`DELETE FROM events WHERE type = 'TEST-FK' AND userid = 3`);
    console.log("Test event cleaned up");
  } catch (err: any) {
    console.error("❌ Event insert STILL FAILS:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
