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

console.log('🔧 CORRIGINDO PLANTÕES DE FEVEREIRO E MARÇO\n');

// Reinserir 28/02/2026 - Tarde (ZN 13-19)
const [result1] = await connection.execute(
  `INSERT INTO events (userId, date, type, description, isShift, isPassed, passedReason, isCancelled, createdBy)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [userId, '2026-02-28', 'ZN 13-19', 'Sábado Tarde', 1, 1, 'Miryan Salomão', 0, 'ADMIN']
);
console.log(`✓ Inserido 28/02/2026 ZN 13-19 (Repassado para Miryan Salomão): ${result1.affectedRows} linhas`);

// Reinserir 01/03/2026 - Manhã (ZN 7-13)
const [result2] = await connection.execute(
  `INSERT INTO events (userId, date, type, description, isShift, isPassed, passedReason, isCancelled, createdBy)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [userId, '2026-03-01', 'ZN 7-13', 'Domingo Manhã', 1, 1, 'Juh Hammes', 0, 'ADMIN']
);
console.log(`✓ Inserido 01/03/2026 ZN 7-13 (Repassado para Juh Hammes): ${result2.affectedRows} linhas`);

console.log('\n✅ Plantões de fevereiro e março corrigidos!\n');

await connection.end();
