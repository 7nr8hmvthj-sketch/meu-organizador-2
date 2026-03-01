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

console.log('=== CORRIGINDO PLANTÕES ZN 7-13 ===\n');

// 1. Deletar todos os ZN 7-13 incorretos
console.log('1. Deletando 102 plantões ZN 7-13 incorretos...');
const [deleteResult] = await connection.execute(
  `DELETE FROM events WHERE type = 'ZN 7-13' AND DATE(date) >= '2026-03-01'`
);
console.log(`   ✓ Deletados ${deleteResult.affectedRows} plantões\n`);

// 2. Inserir terças-feiras (todas as terças de março a dezembro 2026)
console.log('2. Inserindo terças-feiras (44 eventos)...');
const tuesdays = [];
for (let month = 3; month <= 12; month++) {
  const year = 2026;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    // 2 = Tuesday (0=Sunday, 1=Monday, 2=Tuesday)
    if (date.getDay() === 2) {
      tuesdays.push(date);
    }
  }
}

for (const date of tuesdays) {
  const dateStr = date.toISOString().split('T')[0];
  await connection.execute(
    `INSERT INTO events (userId, date, type, description, isShift, createdBy) 
     VALUES (1, ?, 'ZN 7-13', NULL, true, 'USER')`,
    [dateStr]
  );
}
console.log(`   ✓ Inseridos ${tuesdays.length} plantões de terça-feira\n`);

// 3. Inserir quartas-feiras intercaladas (começando em 18/03/2026)
console.log('3. Inserindo quartas-feiras intercaladas (começando em 18/03/2026)...');
const wednesdays = [];
let currentDate = new Date(2026, 2, 18); // 18/03/2026

while (currentDate.getFullYear() === 2026 && currentDate.getMonth() < 12) {
  // Verificar se é quarta-feira (3 = Wednesday)
  if (currentDate.getDay() === 3) {
    wednesdays.push(new Date(currentDate));
    // Pular 2 semanas
    currentDate.setDate(currentDate.getDate() + 14);
  } else {
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

for (const date of wednesdays) {
  const dateStr = date.toISOString().split('T')[0];
  await connection.execute(
    `INSERT INTO events (userId, date, type, description, isShift, createdBy) 
     VALUES (1, ?, 'ZN 7-13', NULL, true, 'USER')`,
    [dateStr]
  );
}
console.log(`   ✓ Inseridos ${wednesdays.length} plantões de quarta-feira intercalada\n`);

// 4. Verificar resultado
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

await connection.end();
