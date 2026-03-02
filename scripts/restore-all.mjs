import mysql from 'mysql2/promise';
import fs from 'fs';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// ============================================================
// PASSO 1: Reimportar os 270 eventos originais do CSV
// ============================================================
console.log('=== PASSO 1: Reimportando eventos do CSV ===');

const sqlContent = fs.readFileSync('/home/ubuntu/meu-organizador-github/scripts/import-events.sql', 'utf-8');
const statements = sqlContent.split(';\n').filter(s => s.trim());

let csvCount = 0;
for (const stmt of statements) {
  const s = stmt.trim();
  if (s && s.startsWith('INSERT')) {
    try {
      await connection.execute(s.endsWith(';') ? s : s + ';');
      csvCount++;
    } catch (err) {
      console.error(`Erro: ${err.message} | SQL: ${s.substring(0, 80)}...`);
    }
  }
}
console.log(`  ${csvCount} eventos do CSV importados`);

// ============================================================
// PASSO 2: Converter tipos antigos para formato atual
// ============================================================
console.log('\n=== PASSO 2: Convertendo tipos para formato atual ===');

const typeMapping = [
  // Zona Norte (Manhã) -> ZN 7-13
  [`UPDATE events SET type = 'ZN 7-13' WHERE type = 'Zona Norte (Manhã)'`, 'Zona Norte (Manhã) -> ZN 7-13'],
  // Zona Norte (Tarde) -> ZN 13-19
  [`UPDATE events SET type = 'ZN 13-19' WHERE type = 'Zona Norte (Tarde)'`, 'Zona Norte (Tarde) -> ZN 13-19'],
  // HC Manhã -> HC 7-13
  [`UPDATE events SET type = 'HC 7-13' WHERE type = 'HC Manhã'`, 'HC Manhã -> HC 7-13'],
  // HC Tarde -> HC 13-19
  [`UPDATE events SET type = 'HC 13-19' WHERE type = 'HC Tarde'`, 'HC Tarde -> HC 13-19'],
  // Noturno (19-07) -> Noturno 19-07
  [`UPDATE events SET type = 'Noturno 19-07' WHERE type = 'Noturno (19-07)'`, 'Noturno (19-07) -> Noturno 19-07'],
];

for (const [sql, label] of typeMapping) {
  const [result] = await connection.execute(sql);
  console.log(`  ${label}: ${result.affectedRows} atualizados`);
}

// ============================================================
// PASSO 3: Adicionar eventos manuais que existiam
// ============================================================
console.log('\n=== PASSO 3: Adicionando eventos manuais ===');

// Eventos manuais que existiam no banco antes do reset
// (baseado nos dados que vi antes do rollback)
const manualEvents = [
  // Janeiro extras
  ['2026-01-12', 'Pessoal', 'Samila', 0, 0],
  
  // Fevereiro extras
  ['2026-02-08', 'visita hd pedro henrique', 'visita hd pedro henrique 15:00', 0, 0],
  ['2026-02-15', 'Lembrete', 'inserir na agenda os dias de leitura, e a programação do clube de leitura; entre no hotmart e veja os comunicados e os comentário, insira na agenda pelo manus os eventos.\ninsira também outros eventos de lazer na agenda para substituirmos pelo jogar devagar 15:30', 0, 0],
  ['2026-02-22', 'ZN 13-19', 'observação 13:00', 1, 0],
  ['2026-02-22', 'Noturno 19-7', 'julia b no pvd 07/02 19:00', 1, 0],
  
  // Março extras
  ['2026-03-01', 'Noturno 19-7', 'Lugar Betini 11/02 19:00', 1, 0],
  ['2026-03-01', 'Lembrete', 'colocar as metas de plantões 09:00', 0, 0],
  ['2026-03-01', 'Lembrete', 'Confirmar plantao 21/03 igor 21:12', 0, 0],
  ['2026-03-29', 'ZN 13-19', 'Observação\nVago grupo 20/02', 1, 0],
  
  // Treinos que existiam
  // Musculação (19 eventos) - terças e quintas, ~2x por semana
  // Pilates (15 eventos) - segundas e quartas, ~2x por semana
  // Esses foram adicionados manualmente pelo usuário, não pelo CSV
];

// Verificar se os eventos manuais já existem (para não duplicar)
for (const [date, type, desc, isShift, isPassed] of manualEvents) {
  // Verificar se já existe
  const [existing] = await connection.execute(
    `SELECT id FROM events WHERE DATE(date) = ? AND type = ? AND description = ? LIMIT 1`,
    [date, type, desc]
  );
  
  if (existing.length === 0) {
    await connection.execute(
      `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled) VALUES (1, ?, ?, ?, ?, ?, 0)`,
      [date, type, desc, isShift, isPassed]
    );
    console.log(`  + ${date} | ${type} | ${desc.substring(0, 40)}`);
  } else {
    console.log(`  = ${date} | ${type} (já existe)`);
  }
}

// ============================================================
// PASSO 4: Adicionar Natação (seg 20:45, ter 11:40, qua 20:45, sex 20:45, sab 12:10)
// ============================================================
console.log('\n=== PASSO 4: Adicionando Natação ===');

const natacaoSchedule = [
  { day: 1, time: '20:45' }, // Segunda
  { day: 2, time: '11:40' }, // Terça
  { day: 3, time: '20:45' }, // Quarta
  { day: 5, time: '20:45' }, // Sexta
  { day: 6, time: '12:10' }  // Sábado
];

let natacaoCount = 0;
const startDate = new Date('2026-01-31');
const endDate = new Date('2026-12-31');

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dayOfWeek = d.getDay();
  const schedule = natacaoSchedule.find(s => s.day === dayOfWeek);
  
  if (schedule) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Verificar se já existe
    const [existing] = await connection.execute(
      `SELECT id FROM events WHERE DATE(date) = ? AND type = 'Natação' LIMIT 1`,
      [dateStr]
    );
    
    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled) VALUES (1, ?, 'Natação', ?, 0, 0, 0)`,
        [dateStr, `Natação ${schedule.time}`]
      );
      natacaoCount++;
    }
  }
}
console.log(`  ${natacaoCount} eventos de natação adicionados`);

// ============================================================
// PASSO 5: Adicionar Musculação (terça e quinta, a partir de fev)
// ============================================================
console.log('\n=== PASSO 5: Adicionando Musculação ===');

let muscCount = 0;
const muscStart = new Date('2026-02-01');
const muscEnd = new Date('2026-12-31');

for (let d = new Date(muscStart); d <= muscEnd; d.setDate(d.getDate() + 1)) {
  const dayOfWeek = d.getDay();
  // Terça (2) e Quinta (4)
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    const dateStr = d.toISOString().split('T')[0];
    const [existing] = await connection.execute(
      `SELECT id FROM events WHERE DATE(date) = ? AND type = 'Musculação' LIMIT 1`,
      [dateStr]
    );
    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled) VALUES (1, ?, 'Musculação', 'Musculação', 0, 0, 0)`,
        [dateStr]
      );
      muscCount++;
    }
  }
}
console.log(`  ${muscCount} eventos de musculação adicionados`);

// ============================================================
// PASSO 6: Adicionar Pilates (segunda e quarta, a partir de fev)
// ============================================================
console.log('\n=== PASSO 6: Adicionando Pilates ===');

let pilatesCount = 0;
const pilStart = new Date('2026-02-01');
const pilEnd = new Date('2026-12-31');

for (let d = new Date(pilStart); d <= pilEnd; d.setDate(d.getDate() + 1)) {
  const dayOfWeek = d.getDay();
  // Segunda (1) e Quarta (3)
  if (dayOfWeek === 1 || dayOfWeek === 3) {
    const dateStr = d.toISOString().split('T')[0];
    const [existing] = await connection.execute(
      `SELECT id FROM events WHERE DATE(date) = ? AND type = 'Pilates' LIMIT 1`,
      [dateStr]
    );
    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled) VALUES (1, ?, 'Pilates', 'Pilates', 0, 0, 0)`,
        [dateStr]
      );
      pilatesCount++;
    }
  }
}
console.log(`  ${pilatesCount} eventos de pilates adicionados`);

// ============================================================
// PASSO 7: Verificação final
// ============================================================
console.log('\n=== VERIFICAÇÃO FINAL ===');

const [totalCount] = await connection.execute(`SELECT COUNT(*) as c FROM events`);
console.log(`Total de eventos: ${totalCount[0].c}`);

const [typeCount] = await connection.execute(
  `SELECT type, COUNT(*) as c FROM events GROUP BY type ORDER BY c DESC`
);
console.log('\nPor tipo:');
typeCount.forEach(r => console.log(`  ${r.type}: ${r.c}`));

// Verificar domingos com ZN 7-13
const [sunZN] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, description 
   FROM events 
   WHERE type = 'ZN 7-13' AND DAYOFWEEK(date) = 1
   ORDER BY date ASC`
);
console.log(`\nDomingos com ZN 7-13: ${sunZN.length}`);
sunZN.forEach(r => console.log(`  ${r.data} | ${r.description || ''}`));

// Verificar sábados com ZN 7-13
const [satZN] = await connection.execute(
  `SELECT DATE_FORMAT(date, '%Y-%m-%d') as data, description 
   FROM events 
   WHERE type = 'ZN 7-13' AND DAYOFWEEK(date) = 7
   ORDER BY date ASC`
);
console.log(`\nSábados com ZN 7-13: ${satZN.length}`);
satZN.forEach(r => console.log(`  ${r.data} | ${r.description || ''}`));

await connection.end();
console.log('\n✅ Restauração completa!');
