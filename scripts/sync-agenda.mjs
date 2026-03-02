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

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  SINCRONIZAÇÃO DE AGENDA - SCRIPT CIRÚRGICO               ║');
console.log('║  Período: 01/03/2026 a 31/12/2026                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================
// FASE 1: LIMPEZA DA SUJEIRA DO CSV
// ============================================================
console.log('📋 FASE 1: LIMPEZA DA SUJEIRA DO CSV');
console.log('─────────────────────────────────────────────────────────────\n');

const typesToDelete = ['ZN', 'HC', 'Noturno', 'Apoio'];
let totalDeleted = 0;

for (const typePattern of typesToDelete) {
  const [result] = await connection.execute(
    `DELETE FROM events 
     WHERE userId = ? AND DATE(date) >= '2026-03-01' 
     AND (type LIKE ? OR type LIKE ?)`,
    [userId, `%${typePattern}%`, `%${typePattern.toLowerCase()}%`]
  );
  console.log(`  ✓ Deletados eventos com '${typePattern}': ${result.affectedRows}`);
  totalDeleted += result.affectedRows;
}

console.log(`\n  ✅ Total deletado: ${totalDeleted} eventos\n`);

// ============================================================
// FASE 2: RECONSTRUÇÃO MATEMÁTICA
// ============================================================
console.log('🔨 FASE 2: RECONSTRUÇÃO MATEMÁTICA (01/03/2026 a 31/12/2026)');
console.log('─────────────────────────────────────────────────────────────\n');

const startDate = new Date('2026-03-01');
const endDate = new Date('2026-12-31');
let insertedCount = 0;

// Helper: Obter semana do mês (1-4)
function getWeekOfMonth(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const diff = date.getDate() - first.getDate();
  return Math.floor(diff / 7) + 1;
}

// Helper: Obter número do sábado no mês (1º, 2º, 3º, 4º, 5º)
function getSaturdayNumberInMonth(date) {
  if (date.getDay() !== 6) return null; // Não é sábado
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  // Encontrar o primeiro sábado
  let firstSaturday = 1;
  while (new Date(date.getFullYear(), date.getMonth(), firstSaturday).getDay() !== 6) {
    firstSaturday++;
  }
  return Math.floor((date.getDate() - firstSaturday) / 7) + 1;
}

// Rastrear segundas-feiras para aplicar regra de terças
const mondayTypeByWeek = {};

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getDay(); // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  const dayOfMonth = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  
  let eventType = null;
  let description = null;

  // DOMINGOS (dayOfWeek === 0)
  if (dayOfWeek === 0) {
    eventType = 'ZN 7-13';
    description = 'Domingo Fixo';
  }

  // SEGUNDAS-FEIRAS (dayOfWeek === 1) - Intercaladas
  if (dayOfWeek === 1 && dateStr >= '2026-03-02') {
    const weekOfMonth = getWeekOfMonth(d);
    // Alternar: semanas pares = ZN 13-19, semanas ímpares = HC 13-19
    if (weekOfMonth % 2 === 0) {
      eventType = 'ZN 13-19';
      description = 'Segunda Intercalada (ZN)';
      mondayTypeByWeek[`${year}-W${Math.ceil(dayOfMonth / 7)}`] = 'ZN';
    } else {
      eventType = 'HC 13-19';
      description = 'Segunda Intercalada (HC)';
      mondayTypeByWeek[`${year}-W${Math.ceil(dayOfMonth / 7)}`] = 'HC';
    }
  }

  // TERÇAS-FEIRAS (dayOfWeek === 2)
  if (dayOfWeek === 2) {
    // Sempre inserir ZN 7-13 (Manhã Fixa)
    if (dateStr >= '2026-03-03') {
      eventType = 'ZN 7-13';
      description = 'Terça Manhã Fixa';
    }
    
    // Tarde Condicional: verificar segunda da mesma semana
    const weekKey = `${year}-W${Math.ceil(dayOfMonth / 7)}`;
    if (mondayTypeByWeek[weekKey] === 'HC') {
      // Se segunda foi HC, inserir ZN 13-19 na terça
      // Isso será inserido como evento separado
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, dateStr, 'ZN 13-19', 'Terça Tarde Condicional', 1, 0, 0, 'ADMIN']
      );
      insertedCount++;
    }
  }

  // QUARTAS-FEIRAS (dayOfWeek === 3) - Manhã Intercalada a cada 14 dias a partir de 01/04
  if (dayOfWeek === 3 && dateStr >= '2026-04-01') {
    const aprilFirst = new Date('2026-04-01');
    const daysFromFirstWednesday = Math.floor((d - aprilFirst) / (1000 * 60 * 60 * 24));
    
    // Primeira quarta de abril é 01/04, depois cada 14 dias
    if (daysFromFirstWednesday % 14 === 0) {
      eventType = 'ZN 7-13';
      description = 'Quarta Intercalada (Manhã)';
    }
  }

  // SEXTAS-FEIRAS (dayOfWeek === 5) - Manhã Fixa a partir de 13/03
  if (dayOfWeek === 5 && dateStr >= '2026-03-13') {
    eventType = 'ZN 7-13';
    description = 'Sexta Manhã Fixa';
  }

  // SÁBADOS (dayOfWeek === 6)
  if (dayOfWeek === 6) {
    const saturdayNum = getSaturdayNumberInMonth(d);
    
    // 2º e 3º Sábado: ZN 7-13 (Manhã)
    if (saturdayNum === 2 || saturdayNum === 3) {
      eventType = 'ZN 7-13';
      description = `Sábado ${saturdayNum}º (Manhã)`;
    }
    
    // 2º e 4º Sábado: Noturno 19-07
    if (saturdayNum === 2 || saturdayNum === 4) {
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, dateStr, 'Noturno 19-07', `Sábado ${saturdayNum}º (Noturno)`, 1, 0, 0, 'ADMIN']
      );
      insertedCount++;
    }
  }

  // Inserir evento principal se houver
  if (eventType) {
    await connection.execute(
      `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, dateStr, eventType, description, 1, 0, 0, 'ADMIN']
    );
    insertedCount++;
  }
}

console.log(`  ✅ Total inserido: ${insertedCount} eventos\n`);

// ============================================================
// FASE 3: EXCEÇÕES E TROCAS
// ============================================================
console.log('🔄 FASE 3: EXCEÇÕES E TROCAS DE WHATSAPP');
console.log('─────────────────────────────────────────────────────────────\n');

// A) Plantões que o usuário PEGOU
const plantoesPegos = [
  { date: '2026-02-07', type: 'ZN 7-13', description: 'De Samila' },
  { date: '2026-02-22', type: 'ZN 13-19', description: 'ZN 13-19 Observação (De Igor)' },
  { date: '2026-03-04', type: 'ZN 13-19', description: 'De Giovana' },
  { date: '2026-03-05', type: 'ZN 13-19', description: 'De Lívia Upa' },
  { date: '2026-03-07', type: 'ZN 13-19', description: 'De Giovana' },
  { date: '2026-03-20', type: 'ZN 13-19', description: 'De Bruna Cruz' },
];

let insertedPegos = 0;
for (const pego of plantoesPegos) {
  // Verificar se já existe
  const [existing] = await connection.execute(
    `SELECT id FROM events WHERE userId = ? AND DATE(date) = ? AND type = ? LIMIT 1`,
    [userId, pego.date, pego.type]
  );
  
  if (existing.length === 0) {
    await connection.execute(
      `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, pego.date, pego.type, pego.description, 1, 0, 0, 'ADMIN']
    );
    console.log(`  ✓ Inserido: ${pego.date} | ${pego.type} | ${pego.description}`);
    insertedPegos++;
  } else {
    console.log(`  = Já existe: ${pego.date} | ${pego.type}`);
  }
}

console.log(`\n  Plantões pegados inseridos: ${insertedPegos}\n`);

// B) Plantões que o usuário PASSOU
const plantoesPassed = [
  { date: '2026-02-21', type: 'ZN 7-13', reason: 'Jordana Meirelles' },
  { date: '2026-02-28', type: null, reason: 'Miryan Salomão' }, // type null = procurar qualquer à tarde
  { date: '2026-03-01', type: 'ZN 7-13', reason: 'Juh Hammes' },
];

let updatedPassed = 0;
for (const passed of plantoesPassed) {
  let whereClause = `userId = ? AND DATE(date) = ?`;
  let params = [userId, passed.date];
  
  if (passed.type) {
    whereClause += ` AND type = ?`;
    params.push(passed.type);
  } else {
    // Para 28/02, procurar qualquer evento à tarde (13-19)
    whereClause += ` AND (type LIKE '%13-19%' OR type LIKE '%tarde%')`;
  }
  
  const [result] = await connection.execute(
    `UPDATE events SET isPassed = 1, passedReason = ? WHERE ${whereClause}`,
    [passed.reason, ...params]
  );
  
  if (result.affectedRows > 0) {
    console.log(`  ✓ Marcado como Repassado: ${passed.date} | Motivo: ${passed.reason}`);
    updatedPassed += result.affectedRows;
  } else {
    console.log(`  ⚠ Não encontrado: ${passed.date} | ${passed.type || 'qualquer tarde'}`);
  }
}

console.log(`\n  Plantões marcados como repassados: ${updatedPassed}\n`);

// ============================================================
// VERIFICAÇÃO FINAL
// ============================================================
console.log('✅ VERIFICAÇÃO FINAL');
console.log('─────────────────────────────────────────────────────────────\n');

const [totalEvents] = await connection.execute(
  `SELECT COUNT(*) as c FROM events WHERE userId = ? AND DATE(date) >= '2026-03-01'`,
  [userId]
);

console.log(`  Total de eventos (03/2026+): ${totalEvents[0].c}`);

const [typeCount] = await connection.execute(
  `SELECT type, COUNT(*) as c FROM events 
   WHERE userId = ? AND DATE(date) >= '2026-03-01'
   GROUP BY type ORDER BY c DESC`,
  [userId]
);

console.log('\n  Resumo por tipo:');
typeCount.forEach(r => {
  console.log(`    ${r.type}: ${r.c}`);
});

// Verificar domingos
const [sundays] = await connection.execute(
  `SELECT COUNT(*) as c FROM events 
   WHERE userId = ? AND DAYOFWEEK(date) = 1 AND DATE(date) >= '2026-03-01'`,
  [userId]
);

console.log(`\n  Domingos com eventos: ${sundays[0].c}`);

// Verificar terças
const [tuesdays] = await connection.execute(
  `SELECT COUNT(*) as c FROM events 
   WHERE userId = ? AND DAYOFWEEK(date) = 3 AND DATE(date) >= '2026-03-01'`,
  [userId]
);

console.log(`  Terças com eventos: ${tuesdays[0].c}`);

// Verificar sábados
const [saturdays] = await connection.execute(
  `SELECT COUNT(*) as c FROM events 
   WHERE userId = ? AND DAYOFWEEK(date) = 7 AND DATE(date) >= '2026-03-01'`,
  [userId]
);

console.log(`  Sábados com eventos: ${saturdays[0].c}`);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO                  ║');
console.log('║  Você pode recarregar a tela agora!                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

await connection.end();
