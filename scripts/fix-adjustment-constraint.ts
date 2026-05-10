import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  try {
    // 1. Remover a constraint antiga (userid, month, year) que não inclui workplaceid
    await db.execute(sql`
      ALTER TABLE monthly_adjustments 
      DROP CONSTRAINT IF EXISTS monthly_adjustments_userid_month_year_key
    `);
    console.log("✅ Old constraint dropped");

    // 2. Criar nova constraint que inclui workplaceid (permitindo múltiplos workplaces por mês)
    await db.execute(sql`
      ALTER TABLE monthly_adjustments 
      ADD CONSTRAINT monthly_adjustments_userid_workplaceid_month_year_key 
      UNIQUE (userid, workplaceid, month, year)
    `);
    console.log("✅ New constraint (userid, workplaceid, month, year) created");

    // 3. Verificar constraints atuais
    const constraints = await db.execute(sql`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'monthly_adjustments'
    `);
    console.log("Current constraints:", JSON.stringify(constraints.rows, null, 2));

  } catch (err: any) {
    console.error("Error:", err.message);
  }

  process.exit(0);
}

main().catch(console.error);
