import { getDb } from "../server/db";
import { users, events } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  // Verificar usuários
  try {
    const allUsers = await db.select({ id: users.id, username: users.username, role: users.role }).from(users).limit(20);
    console.log("Users:", JSON.stringify(allUsers, null, 2));
  } catch (err: any) {
    console.error("Error fetching users:", err.message);
  }

  // Verificar colunas da tabela events via information_schema com drizzle sql tag
  try {
    const cols = await db.execute(
      sql.raw(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position`)
    );
    console.log("Events columns:", JSON.stringify(cols, null, 2));
  } catch (err: any) {
    console.error("Error checking events columns:", err.message);
  }

  // Verificar se agenda_managers existe
  try {
    const tables = await db.execute(
      sql.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
    );
    console.log("All tables:", JSON.stringify(tables, null, 2));
  } catch (err: any) {
    console.error("Error listing tables:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
