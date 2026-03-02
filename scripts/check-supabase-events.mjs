import postgres from 'postgres';

const sql = postgres('postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres', {
  ssl: 'require',
  prepare: false
});

try {
  const count = await sql`SELECT COUNT(*) as total FROM events`;
  console.log('Total eventos no Supabase:', count[0].total);
  
  const sample = await sql`SELECT id, "userId", date, type FROM events LIMIT 5`;
  console.log('\nAmostra de eventos:');
  console.log(sample);
  
  const userIdCount = await sql`SELECT "userId", COUNT(*) as count FROM events GROUP BY "userId"`;
  console.log('\nEventos por userId:');
  console.log(userIdCount);
  
  await sql.end();
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
}
