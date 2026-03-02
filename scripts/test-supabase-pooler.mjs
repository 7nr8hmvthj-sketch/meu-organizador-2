import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TESTE DE CONEXÃO - SUPABASE CONNECTION POOLER            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('🔗 Conectando ao Supabase Connection Pooler...');
console.log(`   URL: postgresql://postgres.ouqticpigsvmcpjjowfz:***@aws-1-sa-east-1.pooler.supabase.com:5432/postgres\n`);

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  const result = await sql`SELECT NOW() as current_time, version()`;
  console.log('✅ CONEXÃO BEM-SUCEDIDA!\n');
  console.log('Informações do Servidor:');
  console.log(`  Hora: ${result[0].current_time}`);
  console.log(`  Versão: ${result[0].version.split(',')[0]}\n`);
  
  // Verificar se tabelas existem
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  console.log(`Tabelas existentes no banco: ${tables.length}`);
  if (tables.length > 0) {
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  }
  
  console.log('\n✅ Teste concluído com sucesso!');
  await sql.end();
} catch (err) {
  console.error('❌ ERRO DE CONEXÃO:');
  console.error(`   ${err.message}`);
  process.exit(1);
}
