import { getDb } from "../server/db";
import bcrypt from "bcryptjs";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  const username = "GIOVANA";
  const password = "gi20ovana";
  const role = "admin";
  const userId = 3; // Next available ID after USER(1) and VEGANO(2)
  
  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Insert into app_users
  try {
    await db.execute(
      `INSERT INTO app_users (username, password_hash, role, user_id) VALUES ('${username}', '${passwordHash}', '${role}', ${userId})`
    );
    console.log(`✅ User GIOVANA created successfully!`);
    console.log(`   Username: GIOVANA`);
    console.log(`   Password: gi20ovana`);
    console.log(`   Role: admin`);
    console.log(`   UserId: ${userId}`);
  } catch (err: any) {
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      console.log("User GIOVANA already exists!");
    } else {
      throw err;
    }
  }
  
  // Verify password hash
  const verify = await bcrypt.compare(password, passwordHash);
  console.log(`   Password verification: ${verify ? 'OK' : 'FAILED'}`);
  
  process.exit(0);
}

main().catch(console.error);
