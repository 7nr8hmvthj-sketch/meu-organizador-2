import postgres from 'postgres';

async function executeWithRetry(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`  ⏳ Tentativa ${i + 1} falhou, retentando em ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function run() {
  const dbUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require';
  
  const sql = postgres(dbUrl, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    connect_timeout: 30,
    idle_timeout: 20,
  });
  
  console.log('🔧 Iniciando automação de intercalação de plantões para 2026...\n');
  
  try {
    console.log('📅 Fase 1: Limpando segundas e terças erradas de 09/03 em diante...');
    
    // 1. Deleta os plantões variáveis antigos das Segundas (dow=1) e Terças (dow=2)
    await executeWithRetry(() => sql`
      DELETE FROM events
      WHERE userid = 1
      AND extract(dow from date) IN (1, 2)
      AND date >= '2026-03-09'
      AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')
    `);
    
    console.log('✅ Plantões antigos removidos\n');
    
    console.log('📅 Fase 2: Gerando novos plantões com intercalação corrigida...\n');
    
    const newEvents = [];
    
    // Começa na próxima segunda-feira após 02/03
    let currentDate = new Date('2026-03-09T12:00:00Z');
    const endDate = new Date('2026-12-31T12:00:00Z');
    let isHcWeek = true; // 09/03 será HC (Semana B)
    
    let weekCount = 0;
    
    while (currentDate <= endDate) {
      weekCount++;
      const mondayStr = currentDate.toISOString().split('T')[0];
      
      const tuesday = new Date(currentDate);
      tuesday.setDate(tuesday.getDate() + 1);
      const tuesdayStr = tuesday.toISOString().split('T')[0];
      
      if (isHcWeek) {
        // Semana B: Segunda (HC 13-19) | Terça (ZN 7-13 E ZN 13-19)
        console.log(`  Semana ${weekCount} (B): ${mondayStr} - HC 13-19 | ${tuesdayStr} - ZN 7-13 + ZN 13-19`);
        newEvents.push({
          userid: 1,
          date: mondayStr,
          type: 'HC 13-19',
          isshift: true,
          createdby: 'SYSTEM',
        });
        newEvents.push({
          userid: 1,
          date: tuesdayStr,
          type: 'ZN 7-13',
          isshift: true,
          createdby: 'SYSTEM',
        });
        newEvents.push({
          userid: 1,
          date: tuesdayStr,
          type: 'ZN 13-19',
          isshift: true,
          createdby: 'SYSTEM',
        });
      } else {
        // Semana A: Segunda (ZN 13-19) | Terça (ZN 7-13)
        console.log(`  Semana ${weekCount} (A): ${mondayStr} - ZN 13-19 | ${tuesdayStr} - ZN 7-13`);
        newEvents.push({
          userid: 1,
          date: mondayStr,
          type: 'ZN 13-19',
          isshift: true,
          createdby: 'SYSTEM',
        });
        newEvents.push({
          userid: 1,
          date: tuesdayStr,
          type: 'ZN 7-13',
          isshift: true,
          createdby: 'SYSTEM',
        });
      }
      
      // Avança 7 dias e inverte a semana
      currentDate.setDate(currentDate.getDate() + 7);
      isHcWeek = !isHcWeek;
    }
    
    console.log(`\n✅ Total de ${newEvents.length} novos plantões gerados\n`);
    
    // Inserir em lotes para evitar timeout
    const batchSize = 50;
    for (let i = 0; i < newEvents.length; i += batchSize) {
      const batch = newEvents.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(newEvents.length / batchSize);
      
      console.log(`  Inserindo lote ${batchNum}/${totalBatches}...`);
      
      // Construir VALUES manualmente para cada evento
      const values = batch.map(e => `('${e.userid}', '${e.date}', '${e.type}', ${e.isshift}, '${e.createdby}')`).join(',');
      
      await executeWithRetry(() => sql.unsafe(`
        INSERT INTO events (userid, date, type, isshift, createdby)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `));
    }
    
    console.log('\n🎉 Intercalação de 2026 concluída com sucesso!');
    console.log('✅ Padrão aplicado:');
    console.log('   - Semana A: Segunda (ZN 13-19) | Terça (ZN 7-13)');
    console.log('   - Semana B: Segunda (HC 13-19) | Terça (ZN 7-13 E ZN 13-19)');
    console.log('   - Período: 09/03/2026 até 31/12/2026');
    
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ Erro durante execução:', error.message);
    if (error.code) console.error('🔐 Código:', error.code);
    process.exit(1);
  }
}

run().catch(console.error);
