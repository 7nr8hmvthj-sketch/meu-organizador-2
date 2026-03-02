import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres', {
  ssl: 'require',
  prepare: false
});

try {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'events'
    ORDER BY ordinal_position
  `;
  console.log('Colunas da tabela events:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`);
  });
  
  await sql.end();
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
}
