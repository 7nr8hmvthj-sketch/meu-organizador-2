import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Verificar diary_entries
const [diary] = await connection.execute(`SELECT COUNT(*) as c FROM diary_entries`);
console.log(`Diário: ${diary[0].c} entradas`);

if (diary[0].c > 0) {
  const [entries] = await connection.execute(`SELECT * FROM diary_entries ORDER BY date ASC`);
  entries.forEach(r => console.log(`  ${r.date} | ${r.title} | ${(r.content || '').substring(0, 50)}`));
} else {
  console.log('  ⚠️ DIÁRIO VAZIO - entradas foram perdidas no rollback');
}

// Verificar lembretes
const [lembretes] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, type, description FROM events WHERE type = 'Lembrete' ORDER BY date`
);
console.log(`\nLembretes: ${lembretes.length}`);
lembretes.forEach(r => console.log(`  ${r.data} | ${r.description}`));

// Verificar todas as tabelas
const tables = ['events', 'diary_entries', 'expenses', 'medications', 'medication_logs', 'user_preferences'];
console.log('\n=== Estado de todas as tabelas ===');
for (const t of tables) {
  const [count] = await connection.execute(`SELECT COUNT(*) as c FROM ${t}`);
  console.log(`  ${t}: ${count[0].c} registros`);
}

await connection.end();
