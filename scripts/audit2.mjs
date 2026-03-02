import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Primeiro: quantos eventos existem no total?
const [total] = await connection.execute(`SELECT COUNT(*) as c FROM events`);
console.log(`TOTAL EVENTOS: ${total[0].c}`);

// Todos os tipos
const [types] = await connection.execute(`SELECT type, COUNT(*) as c FROM events GROUP BY type ORDER BY c DESC`);
console.log('\nTODOS OS TIPOS:');
types.forEach(r => console.log(`  ${r.type}: ${r.c}`));

// Fevereiro - todos os eventos com ZN no tipo
const [febZN] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events 
   WHERE type LIKE '%ZN%' AND date >= '2026-02-01' AND date < '2026-03-01'
   ORDER BY date ASC, type ASC`
);
console.log(`\nFEVEREIRO ZN: ${febZN.length} eventos`);
febZN.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description || ''}`));

// Março - todos os eventos com ZN no tipo
const [marZN] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events 
   WHERE type LIKE '%ZN%' AND date >= '2026-03-01' AND date < '2026-04-01'
   ORDER BY date ASC, type ASC`
);
console.log(`\nMARÇO ZN: ${marZN.length} eventos`);
marZN.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description || ''}`));

// Abril - todos os eventos com ZN no tipo
const [abrZN] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, DAYNAME(date) as dia, type, description 
   FROM events 
   WHERE type LIKE '%ZN%' AND date >= '2026-04-01' AND date < '2026-05-01'
   ORDER BY date ASC, type ASC`
);
console.log(`\nABRIL ZN: ${abrZN.length} eventos`);
abrZN.forEach(r => console.log(`  ${r.data} (${r.dia}) | ${r.type} | ${r.description || ''}`));

// Domingos com qualquer evento - fev a abril
const [sunAll] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, type, description 
   FROM events 
   WHERE DAYOFWEEK(date) = 1 AND date >= '2026-02-01' AND date < '2026-05-01'
   ORDER BY date ASC, type ASC`
);
console.log(`\nDOMINGOS (fev-abr): ${sunAll.length} eventos`);
sunAll.forEach(r => console.log(`  ${r.data} | ${r.type} | ${r.description || ''}`));

// Sábados com qualquer evento - fev a abril
const [satAll] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, type, description 
   FROM events 
   WHERE DAYOFWEEK(date) = 7 AND date >= '2026-02-01' AND date < '2026-05-01'
   ORDER BY date ASC, type ASC`
);
console.log(`\nSÁBADOS (fev-abr): ${satAll.length} eventos`);
satAll.forEach(r => console.log(`  ${r.data} | ${r.type} | ${r.description || ''}`));

// ZN 7-13 por dia da semana (março em diante)
const [zn713] = await connection.execute(
  `SELECT DAYNAME(date) as dia, COUNT(*) as c 
   FROM events 
   WHERE type = 'ZN 7-13' AND date >= '2026-03-01'
   GROUP BY DAYNAME(date)
   ORDER BY c DESC`
);
console.log(`\nZN 7-13 MARÇO+ POR DIA:`);
zn713.forEach(r => console.log(`  ${r.dia}: ${r.c}`));

await connection.end();
