import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  // Verificar se a tabela agenda_managers existe
  try {
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'agenda_managers'
    `);
    console.log("agenda_managers table exists:", result.rows);
  } catch (err: any) {
    console.error("Error checking agenda_managers:", err.message);
  }

  // Verificar todos os usuários cadastrados
  try {
    const result = await db.execute(sql`SELECT id, username, role FROM users LIMIT 20`);
    console.log("Users:", result.rows);
  } catch (err: any) {
    console.error("Error fetching users:", err.message);
  }

  // Verificar se a tabela events tem a coluna iscancelled
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position
    `);
    console.log("Events columns:", result.rows);
  } catch (err: any) {
    console.error("Error checking events columns:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
