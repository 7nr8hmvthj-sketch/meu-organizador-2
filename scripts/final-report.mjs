import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  RELATÓRIO FINAL - MIGRAÇÃO TIDB → SUPABASE              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Contar registros
  const [usersCount] = await sql`SELECT COUNT(*) as count FROM users`;
  const [eventsCount] = await sql`SELECT COUNT(*) as count FROM events`;
  
  console.log('📊 DADOS NO SUPABASE:');
  console.log(`  ✅ Users: ${usersCount.count}`);
  console.log(`  ✅ Events: ${eventsCount.count}`);
  console.log(`  📈 Total: ${usersCount.count + eventsCount.count} registros\n`);
  
  // Amostra de eventos
  const sample = await sql`
    SELECT date, type, COUNT(*) as count
    FROM events
    GROUP BY date, type
    ORDER BY date DESC
    LIMIT 10
  `;
  
  console.log('📅 ÚLTIMOS 10 EVENTOS (amostra):');
  sample.forEach(row => {
    console.log(`  ${row.date} | ${row.type} (${row.count})`);
  });
  
  console.log('\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('   Banco de dados: Supabase PostgreSQL');
  console.log('   Connection Pooler: aws-1-sa-east-1.pooler.supabase.com\n');
  
  await sql.end();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
