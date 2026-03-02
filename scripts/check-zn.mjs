import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const [znEvents] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, 
          DAYNAME(date) as day_name, 
          type 
   FROM events 
   WHERE userId = 1 AND type LIKE '%ZN%' AND DATE(date) >= '2026-03-01'
   ORDER BY date ASC
   LIMIT 30`
);

console.log('Eventos ZN (primeiros 30):');
znEvents.forEach(e => {
  console.log(`  ${e.date_str} (${e.day_name}) | ${e.type}`);
});

// Contar por tipo
const [typeCount] = await connection.execute(
  `SELECT type, COUNT(*) as count
   FROM events 
   WHERE userId = 1 AND DATE(date) >= '2026-03-01'
   GROUP BY type
   ORDER BY count DESC`
);

console.log('\nResumo por tipo:');
typeCount.forEach(r => {
  console.log(`  ${r.type}: ${r.count}`);
});

await connection.end();
