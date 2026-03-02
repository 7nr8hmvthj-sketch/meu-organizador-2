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
console.log('║  SINCRONIZAÇÃO V2 - BLINDADA CONTRA TIMEZONE              ║');
console.log('║  Período: 01/03/2026 a 31/12/2026 (UTC FORÇADO)          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================
// FASE 1: LIMPEZA DEFINITIVA
// ============================================================
console.log('📋 FASE 1: LIMPEZA DEFINITIVA (>= 01/03/2026)');
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
// FASE 2: MATEMÁTICA BLINDADA
// ============================================================
console.log('🔨 FASE 2: RECONSTRUÇÃO MATEMÁTICA (BLINDADA CONTRA TIMEZONE)');
console.log('─────────────────────────────────────────────────────────────\n');

const startDate = new Date('2026-03-01T00:00:00Z');
const endDate = new Date('2026-12-31T23:59:59Z');
let insertedCount = 0;

// Helper: Obter número do sábado no mês (1º, 2º, 3º, 4º, 5º)
function getSaturdayNumberInMonth(date) {
  if (date.getUTCDay() !== 6) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Encontrar o primeiro sábado do mês
  let firstSaturday = 1;
  while (true) {
    const d = new Date(Date.UTC(year, month, firstSaturday));
    if (d.getUTCDay() === 6) break;
    firstSaturday++;
  }
  
  return Math.floor((day - firstSaturday) / 7) + 1;
}

// Helper: Calcular semana desde data de referência
function getWeeksSinceReference(date, referenceDate) {
  const diffMs = date.getTime() - referenceDate.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

// Rastrear segundas-feiras para aplicar regra de terças
const mondayTypeByWeek = {};

for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getUTCDay(); // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  
  let eventType = null;
  let description = null;

  // DOMINGOS (dayOfWeek === 0)
  if (dayOfWeek === 0) {
    eventType = 'ZN 7-13';
    description = 'Domingo Fixo';
  }

  // SEGUNDAS-FEIRAS (dayOfWeek === 1) - Intercaladas
  if (dayOfWeek === 1 && dateStr >= '2026-03-02') {
    const refMonday = new Date('2026-03-02T12:00:00Z');
    const weeksSinceRef = getWeeksSinceReference(d, refMonday);
    
    if (weeksSinceRef % 2 === 0) {
      eventType = 'ZN 13-19';
      description = 'Segunda Intercalada (ZN)';
      mondayTypeByWeek[dateStr] = 'ZN';
    } else {
      eventType = 'HC 13-19';
      description = 'Segunda Intercalada (HC)';
      mondayTypeByWeek[dateStr] = 'HC';
    }
  }

  // TERÇAS-FEIRAS (dayOfWeek === 2)
  if (dayOfWeek === 2) {
    // Sempre inserir ZN 7-13 (Manhã fixa)
    if (dateStr >= '2026-03-03') {
      eventType = 'ZN 7-13';
      description = 'Terça Manhã Fixa';
    }
    
    // Tarde Condicional: verificar segunda da mesma semana
    // Segunda da mesma semana é 1 dia antes
    const mondayOfWeek = new Date(d.getTime() - 1 * 24 * 60 * 60 * 1000);
    const mondayStr = mondayOfWeek.toISOString().split('T')[0];
    
    if (mondayTypeByWeek[mondayStr] === 'HC') {
      // Se segunda foi HC, inserir ZN 13-19 na terça
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
    const aprilFirst = new Date('2026-04-01T12:00:00Z');
    const weeksSinceApril = getWeeksSinceReference(d, aprilFirst);
    
    // Primeira quarta de abril (01/04) é semana 0, depois cada 14 dias (semana 2, 4, 6...)
    if (weeksSinceApril >= 0 && weeksSinceApril % 2 === 0) {
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
// FASE 3: EXCEÇÕES E OVERRIDES
// ============================================================
console.log('🔄 FASE 3: EXCEÇÕES E OVERRIDES');
console.log('─────────────────────────────────────────────────────────────\n');

const overrides = [
  {
    date: '2026-02-07',
    type: 'ZN 7-13',
    description: 'De Samila',
    action: 'insert',
  },
  {
    date: '2026-02-21',
    type: 'ZN 7-13',
    action: 'update',
    isPassed: true,
    passedReason: 'Jordana Meirelles',
  },
  {
    date: '2026-02-22',
    type: 'ZN 13-19',
    description: 'ZN 13-19 Observação',
    action: 'insert',
  },
  {
    date: '2026-02-28',
    type: 'ZN 13-19',
    action: 'update',
    isPassed: true,
    passedReason: 'Miryan Salomão',
  },
  {
    date: '2026-03-01',
    type: 'ZN 7-13',
    action: 'update',
    isPassed: true,
    passedReason: 'Juh Hammes',
  },
  {
    date: '2026-03-04',
    type: 'ZN 13-19',
    description: 'De Giovana',
    action: 'insert',
  },
  {
    date: '2026-03-05',
    type: 'ZN 13-19',
    description: 'De Lívia Upa',
    action: 'insert',
  },
  {
    date: '2026-03-07',
    type: 'ZN 13-19',
    description: 'De Giovana',
    action: 'insert',
  },
  {
    date: '2026-03-20',
    type: 'ZN 13-19',
    description: 'De Bruna',
    action: 'insert',
  },
];

let processedCount = 0;

for (const override of overrides) {
  if (override.action === 'insert') {
    // Verificar se já existe
    const [existing] = await connection.execute(
      `SELECT id FROM events WHERE userId = ? AND DATE(date) = ? AND type = ? LIMIT 1`,
      [userId, override.date, override.type]
    );
    
    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO events (userId, date, type, description, isShift, isPassed, isCancelled, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, override.date, override.type, override.description || null, 1, 0, 0, 'ADMIN']
      );
      console.log(`  ✓ Inserido: ${override.date} | ${override.type} | ${override.description || ''}`);
      processedCount++;
    } else {
      console.log(`  = Já existe: ${override.date} | ${override.type}`);
    }
  } else if (override.action === 'update') {
    const [result] = await connection.execute(
      `UPDATE events SET isPassed = ?, passedReason = ? 
       WHERE userId = ? AND DATE(date) = ? AND type = ?`,
      [override.isPassed ? 1 : 0, override.passedReason || null, userId, override.date, override.type]
    );
    
    if (result.affectedRows > 0) {
      console.log(`  ✓ Atualizado: ${override.date} | ${override.type} | Motivo: ${override.passedReason}`);
      processedCount++;
    } else {
      console.log(`  ⚠ Não encontrado: ${override.date} | ${override.type}`);
    }
  }
}

console.log(`\n  Exceções processadas: ${processedCount}\n`);

// ============================================================
// VERIFICAÇÃO FINAL
// ============================================================
console.log('✅ VERIFICAÇÃO FINAL');
console.log('─────────────────────────────────────────────────────────────\n');

const [allEvents] = await connection.execute(
  `SELECT * FROM events WHERE userId = ? AND DATE(date) >= '2026-03-01'`,
  [userId]
);

console.log(`  Total de eventos (03/2026+): ${allEvents.length}`);

// Contar por tipo
const typeCount = {};
allEvents.forEach(e => {
  typeCount[e.type] = (typeCount[e.type] || 0) + 1;
});

console.log('\n  Resumo por tipo:');
Object.entries(typeCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });

// Verificar domingos
const sundays = allEvents.filter(e => {
  const d = new Date(e.date + 'T12:00:00Z');
  return d.getUTCDay() === 0;
});
console.log(`\n  Domingos com eventos: ${sundays.length}`);

// Verificar terças
const tuesdays = allEvents.filter(e => {
  const d = new Date(e.date + 'T12:00:00Z');
  return d.getUTCDay() === 2;
});
console.log(`  Terças com eventos: ${tuesdays.length}`);

// Verificar sábados
const saturdays = allEvents.filter(e => {
  const d = new Date(e.date + 'T12:00:00Z');
  return d.getUTCDay() === 6;
});
console.log(`  Sábados com eventos: ${saturdays.length}`);

// Verificar eventos repassados
const passed = allEvents.filter(e => e.isPassed);
console.log(`  Eventos repassados: ${passed.length}`);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  ✅ SINCRONIZAÇÃO V2 CONCLUÍDA COM SUCESSO              ║');
console.log('║  Você pode recarregar a tela agora!                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

await connection.end();
