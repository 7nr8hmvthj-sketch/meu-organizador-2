import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

console.log('🔍 Testando conexão com Supabase PostgreSQL...');
console.log('URL:', DATABASE_URL.replace(/:[^:]*@/, ':***@'));

try {
  const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    max: 10,
    idle_timeout: 20,
    socket_timeout: 30,
    connect_timeout: 10
  });

  console.log('✅ Conexão criada. Testando query...');
  
  const result = await sql`SELECT COUNT(*) as total FROM events WHERE userid = 1`;
  console.log('✅ Query bem-sucedida!');
  console.log('Total de eventos:', result[0].total);
  
  const sample = await sql`SELECT id, date, type FROM events WHERE userid = 1 LIMIT 3`;
  console.log('Primeiros 3 eventos:', sample);
  
  await sql.end();
  console.log('✅ Conexão fechada com sucesso');
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
