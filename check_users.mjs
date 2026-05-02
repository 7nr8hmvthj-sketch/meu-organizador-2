import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

try {
  const users = await sql`SELECT id, username, role FROM "user" ORDER BY id DESC LIMIT 5`;
  console.log("=== ÚLTIMOS 5 USUÁRIOS ===");
  users.forEach(u => {
    console.log(`ID: ${u.id} | Username: ${u.username} | Role: ${u.role}`);
  });
  await sql.end();
} catch (err) {
  console.error("Erro:", err.message);
}
