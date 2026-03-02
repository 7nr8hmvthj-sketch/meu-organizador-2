import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require', {
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

const result = await sql`
  SELECT DATE(date) as data, type, description 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) IN ('2026-03-25', '2026-03-05', '2026-03-06', '2026-03-31')
  ORDER BY DATE(date), type
`;

console.log('✅ Eventos inseridos:');
result.forEach(r => {
  console.log(`   ${r.data}: ${r.type}`);
});

await sql.end();
