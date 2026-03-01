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

console.log('Corrigindo padrão de quartas-feiras intercaladas...\n');

// Deletar todas as quartas-feiras ZN 7-13
console.log('1. Deletando todas as quartas-feiras ZN 7-13...');
const [deleteResult] = await connection.execute(
  `DELETE FROM events WHERE type = 'ZN 7-13' AND DAYNAME(date) = 'Wednesday' AND DATE(date) >= '2026-03-01'`
);
console.log(`   ✓ Deletados ${deleteResult.affectedRows} eventos\n`);

// Inserir novo padrão: 18/03, 01/04, 15/04, 29/04, 13/05, 27/05, 10/06, 24/06, 08/07, 22/07, 05/08, 19/08, 02/09, 16/09, 30/09, 14/10, 28/10, 11/11, 25/11, 09/12, 23/12
console.log('2. Inserindo novo padrão de quartas-feiras intercaladas...');

const dates = [
  '2026-03-18', '2026-04-01', '2026-04-15', '2026-04-29',
  '2026-05-13', '2026-05-27', '2026-06-10', '2026-06-24',
  '2026-07-08', '2026-07-22', '2026-08-05', '2026-08-19',
  '2026-09-02', '2026-09-16', '2026-09-30', '2026-10-14',
  '2026-10-28', '2026-11-11', '2026-11-25', '2026-12-09',
  '2026-12-23'
];

for (const dateStr of dates) {
  await connection.execute(
    `INSERT INTO events (userId, date, type, description, isShift, createdBy) 
     VALUES (1, ?, 'ZN 7-13', NULL, true, 'USER')`,
    [dateStr]
  );
}
console.log(`   ✓ Inseridos ${dates.length} plantões\n`);

// Verificar resultado
const [finalRows] = await connection.execute(
  `SELECT COUNT(*) as total, 
          SUM(CASE WHEN DAYNAME(date) = 'Tuesday' THEN 1 ELSE 0 END) as tuesdays,
          SUM(CASE WHEN DAYNAME(date) = 'Wednesday' THEN 1 ELSE 0 END) as wednesdays
   FROM events 
   WHERE type = 'ZN 7-13' AND DATE(date) >= '2026-03-01'`
);

console.log('=== RESULTADO FINAL ===');
console.log(`Total: ${finalRows[0].total}`);
console.log(`Terças-feiras: ${finalRows[0].tuesdays}`);
console.log(`Quartas-feiras: ${finalRows[0].wednesdays}`);

// Listar as quartas-feiras para verificar
const [wednesdays] = await connection.execute(
  `SELECT DATE(date) as data FROM events 
   WHERE type = 'ZN 7-13' AND DAYNAME(date) = 'Wednesday' AND DATE(date) >= '2026-03-01' 
   ORDER BY date ASC`
);

console.log('\nQuartas-feiras intercaladas:');
wednesdays.forEach((row, idx) => {
  console.log(`${idx + 1}. ${row.data}`);
});

await connection.end();
