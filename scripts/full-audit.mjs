import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// ============================================================
// AUDITORIA COMPLETA: Comparar fevereiro (intocado) vs março+
// ============================================================

// 1. FEVEREIRO COMPLETO - Estado de referência (não foi tocado)
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  FEVEREIRO 2026 - ESTADO DE REFERÊNCIA (INTOCADO) ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [febAll] = await connection.execute(
  `SELECT DATE(date) as data, DAYNAME(date) as dia, type, description 
   FROM events 
   WHERE type LIKE '%ZN%' AND DATE(date) >= '2026-02-01' AND DATE(date) <= '2026-02-28'
   ORDER BY date ASC, type ASC`
);
febAll.forEach(row => {
  console.log(`  ${row.data} (${row.dia}) | ${row.type} | ${row.description || ''}`);
});

// Resumo fevereiro por dia da semana
const febByDay = {};
febAll.forEach(row => {
  const key = `${row.dia}-${row.type}`;
  febByDay[key] = (febByDay[key] || 0) + 1;
});
console.log('\n  PADRÃO FEVEREIRO:');
Object.entries(febByDay).sort().forEach(([key, count]) => {
  console.log(`    ${key}: ${count}x`);
});

// 2. MARÇO COMPLETO - Estado atual (tocado)
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  MARÇO 2026 - ESTADO ATUAL (APÓS INTERVENÇÃO)    ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [marAll] = await connection.execute(
  `SELECT DATE(date) as data, DAYNAME(date) as dia, type, description 
   FROM events 
   WHERE type LIKE '%ZN%' AND DATE(date) >= '2026-03-01' AND DATE(date) <= '2026-03-31'
   ORDER BY date ASC, type ASC`
);
marAll.forEach(row => {
  console.log(`  ${row.data} (${row.dia}) | ${row.type} | ${row.description || ''}`);
});

const marByDay = {};
marAll.forEach(row => {
  const key = `${row.dia}-${row.type}`;
  marByDay[key] = (marByDay[key] || 0) + 1;
});
console.log('\n  PADRÃO MARÇO:');
Object.entries(marByDay).sort().forEach(([key, count]) => {
  console.log(`    ${key}: ${count}x`);
});

// 3. COMPARAÇÃO: O que existe em fev mas não em março
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  COMPARAÇÃO: PADRÕES PERDIDOS                    ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const febDays = new Set(Object.keys(febByDay));
const marDays = new Set(Object.keys(marByDay));
febDays.forEach(key => {
  if (!marDays.has(key)) {
    console.log(`  ❌ PERDIDO: ${key} (existia em fev, não existe em março)`);
  }
});
marDays.forEach(key => {
  if (!febDays.has(key)) {
    console.log(`  ➕ NOVO: ${key} (não existia em fev, existe em março)`);
  }
});

// 4. TODOS os ZN 7-13 de março em diante por dia da semana
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  ZN 7-13 MARÇO-DEZ POR DIA DA SEMANA             ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [zn713byDay] = await connection.execute(
  `SELECT DAYNAME(date) as dia, COUNT(*) as count 
   FROM events 
   WHERE type = 'ZN 7-13' AND DATE(date) >= '2026-03-01'
   GROUP BY DAYNAME(date)
   ORDER BY FIELD(DAYNAME(date), 'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')`
);
zn713byDay.forEach(row => {
  console.log(`  ${row.dia}: ${row.count}`);
});

// 5. ZN 13-19 de março em diante por dia da semana
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  ZN 13-19 MARÇO-DEZ POR DIA DA SEMANA            ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [zn1319byDay] = await connection.execute(
  `SELECT DAYNAME(date) as dia, COUNT(*) as count 
   FROM events 
   WHERE type = 'ZN 13-19' AND DATE(date) >= '2026-03-01'
   GROUP BY DAYNAME(date)
   ORDER BY FIELD(DAYNAME(date), 'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')`
);
zn1319byDay.forEach(row => {
  console.log(`  ${row.dia}: ${row.count}`);
});

// 6. ZN 13:00 (tipo antigo) - verificar se existem
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  ZN 13:00 (TIPO ANTIGO) - VERIFICAR              ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [zn1300] = await connection.execute(
  `SELECT DATE(date) as data, DAYNAME(date) as dia, description 
   FROM events 
   WHERE type = 'ZN 13:00'
   ORDER BY date ASC`
);
console.log(`  Total: ${zn1300.length}`);
zn1300.forEach(row => {
  console.log(`  ${row.data} (${row.dia}) | ${row.description || ''}`);
});

// 7. Domingos detalhados - TODOS os eventos
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  DOMINGOS - TODOS OS EVENTOS (FEV + MAR)         ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [sunAll] = await connection.execute(
  `SELECT DATE(date) as data, type, description 
   FROM events 
   WHERE DAYNAME(date) = 'Sunday' AND DATE(date) >= '2026-02-01' AND DATE(date) <= '2026-04-30'
   ORDER BY date ASC, type ASC`
);
sunAll.forEach(row => {
  console.log(`  ${row.data} | ${row.type} | ${row.description || ''}`);
});

// 8. Sábados detalhados - TODOS os eventos
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  SÁBADOS - TODOS OS EVENTOS (FEV + MAR + ABR)    ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [satAll] = await connection.execute(
  `SELECT DATE(date) as data, type, description 
   FROM events 
   WHERE DAYNAME(date) = 'Saturday' AND DATE(date) >= '2026-02-01' AND DATE(date) <= '2026-04-30'
   ORDER BY date ASC, type ASC`
);
satAll.forEach(row => {
  console.log(`  ${row.data} | ${row.type} | ${row.description || ''}`);
});

// 9. Verificar se os ZN 7-13 que inseri (terças e quartas) criaram duplicatas
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  DUPLICATAS ZN 7-13 (MESMA DATA, MESMO TIPO)     ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const [dupes] = await connection.execute(
  `SELECT DATE(date) as data, type, COUNT(*) as count 
   FROM events 
   WHERE type = 'ZN 7-13' AND DATE(date) >= '2026-03-01'
   GROUP BY DATE(date), type
   HAVING COUNT(*) > 1
   ORDER BY date ASC`
);
console.log(`  Datas com duplicatas: ${dupes.length}`);
dupes.forEach(row => {
  console.log(`  ${row.data} | ${row.type} | ${row.count}x`);
});

await connection.end();
