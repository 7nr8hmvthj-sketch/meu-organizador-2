import postgres from "postgres";

const sql = postgres("postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres");

async function main() {
  // Find Jordana
  const users = await sql`SELECT id, username, role FROM app_users WHERE LOWER(username) LIKE '%jordana%'`;
  console.log("User:", JSON.stringify(users));

  if (users.length > 0) {
    const userId = users[0].id;
    // Check her events
    const events = await sql`SELECT id, userid, type, date, "createdby" FROM events WHERE userid = ${userId} ORDER BY date DESC LIMIT 5`;
    console.log("Her events:", JSON.stringify(events));

    // Check managed users
    const managed = await sql`SELECT * FROM agenda_managers WHERE manager_id = ${userId}`;
    console.log("Managed:", JSON.stringify(managed));
  }

  await sql.end();
}

main().catch(console.error);
