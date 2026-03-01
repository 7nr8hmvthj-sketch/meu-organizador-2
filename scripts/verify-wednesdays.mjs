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

// Listar todas as quartas-feiras
const [rows] = await connection.execute(
  `SELECT DATE(date) as data, DAYNAME(date) as dia FROM events 
   WHERE type = 'ZN 7-13' AND DAYNAME(date) = 'Wednesday' AND DATE(date) >= '2026-03-01' 
   ORDER BY date ASC`
);

console.log('=== QUARTAS-FEIRAS INTERCALADAS ===\n');
rows.forEach((row, idx) => {
  console.log(`${idx + 1}. ${row.data} (${row.dia})`);
});

await connection.end();
