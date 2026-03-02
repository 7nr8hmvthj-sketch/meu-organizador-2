import postgres from 'postgres';

// Carregar .env.local
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

const sql = postgres(dbUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false,
  connect_timeout: 30,
  idle_timeout: 20,
  max_lifetime: 60 * 60 * 1000,
});

// Retry helper
async function executeWithRetry(query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await query();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`  ⏳ Tentativa ${i + 1} falhou, retentando em 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  console.log('🔧 Iniciando ajustes de plantões...');
  console.log('Database URL:', dbUrl.substring(0, 80) + '...\n');

  try {
    // ========== FASE 1: AJUSTAR INTERCALAÇÃO DE MARÇO ==========
    console.log('📅 FASE 1: Ajustando intercalação de plantões em março/2026\n');

    // Segunda 02/03: Mudar HC 13-19 para ZN 13-19
    console.log('  • Segunda 02/03: Mudando HC 13-19 → ZN 13-19');
    await executeWithRetry(() => sql`
      UPDATE events 
      SET type = 'ZN 13-19' 
      WHERE userid = 1 
        AND DATE(date) = '2026-03-02' 
        AND type = 'HC 13-19'
    `);

    // Terça 03/03: Remover ZN 13-19 (deixar apenas ZN 7-13)
    console.log('  • Terça 03/03: Removendo ZN 13-19');
    await executeWithRetry(() => sql`
      DELETE FROM events 
      WHERE userid = 1 
        AND DATE(date) = '2026-03-03' 
        AND type = 'ZN 13-19'
    `);

    // Verificar resultado
    const result = await executeWithRetry(() => sql`
      SELECT DATE(date) as data, type, description 
      FROM events 
      WHERE userid = 1 
        AND DATE(date) IN ('2026-03-02', '2026-03-03')
      ORDER BY DATE(date), type
    `);
    
    console.log('\n  ✅ Resultado após ajustes:');
    result.forEach(row => {
      console.log(`     ${row.data}: ${row.type}`);
    });

    // ========== FASE 2: INSERIR NOVOS PLANTÕES FIXOS ==========
    console.log('\n📅 FASE 2: Inserindo novos plantões fixos\n');

    // 1. Dia 25/03/2026: Quarta Manhã (ZN 7-13) - Maickon
    console.log('  • 25/03/2026 (Quarta): ZN 7-13 - Maickon');
    await executeWithRetry(() => sql`
      INSERT INTO events (userid, date, type, description, isshift, createdby)
      VALUES (1, '2026-03-25', 'ZN 7-13', 'ZN 7-13 - Maickon', true, 'USER')
      ON CONFLICT DO NOTHING
    `);

    // 2. Todas as Quintas-feiras: HC 7-13
    console.log('  • Todas as Quintas-feiras: HC 7-13');
    const quintas = [5, 12, 19, 26]; // Dias das quintas em março/2026
    for (const dia of quintas) {
      await executeWithRetry(() => sql`
        INSERT INTO events (userid, date, type, description, isshift, createdby)
        VALUES (1, ${'2026-03-' + String(dia).padStart(2, '0')}, 'HC 7-13', 'HC 7-13', true, 'USER')
        ON CONFLICT DO NOTHING
      `);
    }
    console.log(`    ✓ Inseridas 4 quintas-feiras (dias 5, 12, 19, 26)`);

    // 3. Primeira Sexta-feira do mês: Noturno 19-07
    // Primeira sexta de março/2026 é dia 6
    console.log('  • Primeira Sexta-feira (06/03): Noturno 19-07');
    await executeWithRetry(() => sql`
      INSERT INTO events (userid, date, type, description, isshift, createdby)
      VALUES (1, '2026-03-06', 'Noturno 19-07', 'Noturno 19-07', true, 'USER')
      ON CONFLICT DO NOTHING
    `);

    // 4. Quinta Sexta-feira do mês (se existir): Noturno 19-01
    // Março/2026 tem 5 sextas (6, 13, 20, 27, 31) - quinta é dia 31
    console.log('  • Quinta Sexta-feira (31/03): Noturno 19-01');
    await executeWithRetry(() => sql`
      INSERT INTO events (userid, date, type, description, isshift, createdby)
      VALUES (1, '2026-03-31', 'Noturno 19-01', 'Noturno 19-01', true, 'USER')
      ON CONFLICT DO NOTHING
    `);

    // 5. Quinto Sábado do mês (se existir): ZN 7-13
    // Março/2026 tem sábados (1, 8, 15, 22, 29) - NÃO tem quinto sábado
    console.log('  • Quinto Sábado: Não existe em março/2026');

    // ========== VERIFICAÇÃO FINAL ==========
    console.log('\n✅ VERIFICAÇÃO FINAL:');
    const allNewEvents = await executeWithRetry(() => sql`
      SELECT DATE(date) as data, type, description 
      FROM events 
      WHERE userid = 1 
        AND DATE(date) >= '2026-03-02'
      ORDER BY DATE(date), type
      LIMIT 50
    `);

    console.log(`\n📊 Plantões em março/2026 (a partir de 02/03):`);
    allNewEvents.forEach(row => {
      console.log(`   ${row.data}: ${row.type}`);
    });

    console.log(`\n🎉 Total de eventos listados: ${allNewEvents.length}`);
    console.log('✅ Todos os ajustes foram aplicados com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.hint) console.error('💡 Dica:', error.hint);
    if (error.code) console.error('🔐 Código:', error.code);
    process.exit(1);
  } finally {
    try {
      await sql.end();
    } catch (e) {
      // ignore
    }
  }
}

main().catch(console.error);
