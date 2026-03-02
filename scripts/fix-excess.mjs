import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// O banco anterior tinha apenas 19 Musculação e 15 Pilates
// Isso significa que NÃO eram eventos fixos gerados automaticamente
// Eram eventos inseridos manualmente pelo usuário
// Vou deletar os que eu inseri e manter apenas os que o usuário teria criado

// Deletar TODOS os musculação e pilates que eu inseri
// (os que têm description = 'Musculação' ou 'Pilates' genérico)
console.log('=== Removendo Musculação e Pilates em excesso ===');

const [delMusc] = await connection.execute(
  `DELETE FROM events WHERE type = 'Musculação' AND description = 'Musculação'`
);
console.log(`Musculação removidos: ${delMusc.affectedRows}`);

const [delPil] = await connection.execute(
  `DELETE FROM events WHERE type = 'Pilates' AND description = 'Pilates'`
);
console.log(`Pilates removidos: ${delPil.affectedRows}`);

// Verificar contagem final
const [types] = await connection.execute(
  `SELECT type, COUNT(*) as c FROM events GROUP BY type ORDER BY c DESC`
);
console.log('\nContagem final por tipo:');
types.forEach(r => console.log(`  ${r.type}: ${r.c}`));

const [total] = await connection.execute(`SELECT COUNT(*) as c FROM events`);
console.log(`\nTotal: ${total[0].c}`);

// Agora verificar o problema do deslocamento de 2 dias
// No CSV original, as datas estavam deslocadas +2 dias
// Verificar: 01/01/2026 é quinta-feira
// No CSV, 01/01 tinha "HC manha" e "7-19 troca com a Lygia"
// Vamos verificar se os dias da semana fazem sentido

console.log('\n=== Verificando deslocamento de datas ===');
console.log('01/01/2026 deveria ser quinta-feira:');
const [jan1] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events WHERE DATE(date) = '2026-01-01' ORDER BY type`
);
jan1.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description}`));

// Verificar fevereiro - domingos
console.log('\nDomingos de fevereiro (devem ter ZN 7-13):');
const [febSun] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events WHERE DAYOFWEEK(date) = 1 AND DATE(date) >= '2026-02-01' AND DATE(date) < '2026-03-01'
   ORDER BY date, type`
);
febSun.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description}`));

// Verificar terças de fevereiro
console.log('\nTerças de fevereiro:');
const [febTue] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events WHERE DAYOFWEEK(date) = 3 AND DATE(date) >= '2026-02-01' AND DATE(date) < '2026-03-01'
   AND type LIKE '%ZN%'
   ORDER BY date, type`
);
febTue.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description}`));

await connection.end();
