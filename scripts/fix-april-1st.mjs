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

console.log('Verificando e corrigindo quarta-feira de 1º de abril...\n');

// Deletar ZN 7-13 de 1º de abril (2026-04-01)
const [result] = await connection.execute(
  `DELETE FROM events WHERE type = 'ZN 7-13' AND DATE(date) = '2026-04-01'`
);

console.log(`Deletados: ${result.affectedRows} eventos de 1º de abril`);

// Verificar as quartas-feiras intercaladas corretas
const [wednesdays] = await connection.execute(
  `SELECT DATE(date) as data, DAYNAME(date) as dia FROM events 
   WHERE type = 'ZN 7-13' AND DAYNAME(date) = 'Wednesday' AND DATE(date) >= '2026-03-01' 
   ORDER BY date ASC`
);

console.log('\nQuartas-feiras intercaladas (corretas):');
wednesdays.forEach((row, idx) => {
  console.log(`${idx + 1}. ${row.data} (${row.dia})`);
});

await connection.end();
