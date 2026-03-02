import pkg from 'pg';

const { Client } = pkg;

console.log('Testando conexão com Supabase...');
console.log('URL: postgresql://postgres:***@db.ouqticpigsvmcpjjowfz.supabase.co:5432/postgres\n');

const supabaseUrl = 'postgresql://postgres:%Y_WZ4yPFkFajr%26@db.ouqticpigsvmcpjjowfz.supabase.co:5432/postgres';

const client = new Client({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 5000,
  query_timeout: 5000,
});

try {
  console.log('Conectando...');
  await client.connect();
  console.log('✓ Conectado com sucesso!');
  
  const result = await client.query('SELECT NOW()');
  console.log('✓ Query executada:', result.rows[0]);
  
  await client.end();
} catch (err) {
  console.error('✗ Erro:', err.message);
  process.exit(1);
}
