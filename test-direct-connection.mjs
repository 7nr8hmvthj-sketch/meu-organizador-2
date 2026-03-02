import postgres from 'postgres';

// URL com pooler (atual)
const POOLER_URL = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

// URL direta (sem pooler)
const DIRECT_URL = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.postgres.supabase.co:5432/postgres?sslmode=require';

console.log('🔍 Testando conexão com Pooler vs Direto...\n');

async function testConnection(name, url) {
  console.log(`📝 Testando ${name}...`);
  try {
    const sql = postgres(url, {
      ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
      prepare: false,
      max: 10,
      socket_timeout: 60,
      connect_timeout: 30
    });

    console.log(`  ⏳ Conectando...`);
    const result = await sql`SELECT COUNT(*) as total FROM events WHERE userid = 1`;
    console.log(`  ✅ Sucesso! Total de eventos: ${result[0].total}`);
    
    await sql.end();
    return true;
  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    return false;
  }
}

async function main() {
  const poolerOk = await testConnection('Pooler', POOLER_URL);
  console.log();
  const directOk = await testConnection('Direto', DIRECT_URL);
  
  console.log('\n📊 Resultado:');
  console.log(`  Pooler: ${poolerOk ? '✅' : '❌'}`);
  console.log(`  Direto: ${directOk ? '✅' : '❌'}`);
  
  if (directOk && !poolerOk) {
    console.log('\n💡 Recomendação: Use a URL direta em vez do pooler');
  }
}

main().catch(console.error);
