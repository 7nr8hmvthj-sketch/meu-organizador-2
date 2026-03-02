import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  console.log(`Tabelas no banco: ${tables.length}`);
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  
  await sql.end();
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
}
