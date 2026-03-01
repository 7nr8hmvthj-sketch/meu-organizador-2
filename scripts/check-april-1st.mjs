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

console.log('Verificando eventos de 01/04/2026...\n');

// Verificar todos os eventos de 01/04/2026
const [rows] = await connection.execute(
  `SELECT id, DATE(date) as data, DAYNAME(date) as dia, type, description FROM events 
   WHERE DATE(date) = '2026-04-01'
   ORDER BY type ASC`
);

console.log(`Total de eventos em 01/04/2026: ${rows.length}\n`);
rows.forEach((row) => {
  console.log(`- ${row.type}: ${row.description || '(sem descrição)'}`);
});

// Verificar se há ZN 7-13 em 01/04
const [znRows] = await connection.execute(
  `SELECT COUNT(*) as count FROM events 
   WHERE DATE(date) = '2026-04-01' AND type = 'ZN 7-13'`
);

console.log(`\nZN 7-13 em 01/04: ${znRows[0].count}`);

// Verificar qual dia da semana é 01/04
console.log(`\n01/04/2026 é uma ${rows.length > 0 ? rows[0].dia : 'quarta-feira (calculado)'}`);

// Verificar próximas quartas intercaladas
console.log('\nQuartas-feiras intercaladas esperadas:');
console.log('18/03 ✓');
console.log('01/04 ← DEVERIA TER? (primeira quarta após 18/03 é 25/03, depois 01/04)');
console.log('15/04');
console.log('29/04');

await connection.end();
