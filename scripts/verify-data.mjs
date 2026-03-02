import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const userId = 1;

console.log('Verificando dados inseridos...\n');

// Verificar alguns eventos específicos
const [events] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date_formatted, 
          DAYNAME(date) as day_name, 
          DAYOFWEEK(date) as day_of_week,
          type 
   FROM events 
   WHERE userId = ? AND DATE(date) >= '2026-03-01'
   LIMIT 20`,
  [userId]
);

console.log('Primeiros 20 eventos:');
events.forEach(e => {
  console.log(`  ${e.date_formatted} (${e.day_name}, dow=${e.day_of_week}) | ${e.type}`);
});

// Contar por dia da semana
const [dayOfWeekCount] = await connection.execute(
  `SELECT DAYOFWEEK(date) as dow, DAYNAME(date) as day_name, COUNT(*) as count
   FROM events 
   WHERE userId = ? AND DATE(date) >= '2026-03-01'
   GROUP BY DAYOFWEEK(date)
   ORDER BY DAYOFWEEK(date)`,
  [userId]
);

console.log('\nEventos por dia da semana:');
dayOfWeekCount.forEach(r => {
  console.log(`  ${r.day_name} (${r.dow}): ${r.count}`);
});

await connection.end();
