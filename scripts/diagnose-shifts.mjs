import mysql from 'mysql2/promise';

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false,
  },
});

// Listar todos os ZN 7-13 a partir de março
const [rows] = await connection.execute(
  `SELECT id, DATE(date) as data, DAYNAME(date) as dia, DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as datetime_full
   FROM events 
   WHERE type = 'ZN 7-13' AND DATE(date) >= '2026-03-01' 
   ORDER BY date ASC`
);

console.log('=== PLANTÕES ZN 7-13 ATUAIS ===\n');
rows.forEach((row, idx) => {
  console.log(`${idx + 1}. ID: ${row.id} | Data: ${row.data} (${row.dia}) | DateTime: ${row.datetime_full}`);
});

console.log(`\n=== RESUMO ===`);
console.log(`Total: ${rows.length} plantões`);

// Contar por dia da semana
const byDay = {};
rows.forEach(row => {
  byDay[row.dia] = (byDay[row.dia] || 0) + 1;
});
console.log('\nPor dia da semana:');
Object.entries(byDay).forEach(([dia, count]) => {
  console.log(`  ${dia}: ${count}`);
});

await connection.end();
