import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require', {
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

console.log('📅 Verificando eventos de MARÇO/2026\n');

// Verificar ajustes de intercalação
console.log('✅ FASE 1: Intercalação ajustada');
const intercalacao = await sql`
  SELECT DATE(date) as data, type 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) IN ('2026-03-02', '2026-03-03')
  ORDER BY DATE(date), type
`;
intercalacao.forEach(r => {
  console.log(`   ${r.data}: ${r.type}`);
});

// Verificar HC 7-13 nas quintas
console.log('\n✅ FASE 2: HC 7-13 nas Quintas-feiras');
const quintas = await sql`
  SELECT DATE(date) as data, type 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) IN ('2026-03-05', '2026-03-12', '2026-03-19', '2026-03-26')
    AND type LIKE '%HC%'
  ORDER BY DATE(date)
`;
if (quintas.length === 0) {
  console.log('   ❌ Nenhum HC 7-13 encontrado nas quintas!');
} else {
  quintas.forEach(r => {
    console.log(`   ${r.data}: ${r.type}`);
  });
}

// Verificar Noturno 19-07 na primeira sexta
console.log('\n✅ FASE 3: Noturno 19-07 na primeira sexta (06/03)');
const primeiraSexa = await sql`
  SELECT DATE(date) as data, type 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) = '2026-03-06'
    AND type LIKE '%Noturno%'
`;
if (primeiraSexa.length === 0) {
  console.log('   ❌ Nenhum Noturno 19-07 encontrado em 06/03!');
} else {
  primeiraSexa.forEach(r => {
    console.log(`   ${r.data}: ${r.type}`);
  });
}

// Verificar Noturno 19-01 na quinta sexta
console.log('\n✅ FASE 4: Noturno 19-01 na quinta sexta (31/03)');
const quintaSexa = await sql`
  SELECT DATE(date) as data, type 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) = '2026-03-31'
    AND type LIKE '%Noturno%'
`;
if (quintaSexa.length === 0) {
  console.log('   ❌ Nenhum Noturno 19-01 encontrado em 31/03!');
} else {
  quintaSexa.forEach(r => {
    console.log(`   ${r.data}: ${r.type}`);
  });
}

// Verificar ZN 7-13 em 25/03 (Maickon)
console.log('\n✅ FASE 5: ZN 7-13 - Maickon em 25/03');
const maickon = await sql`
  SELECT DATE(date) as data, type, description 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) = '2026-03-25'
    AND type = 'ZN 7-13'
`;
if (maickon.length === 0) {
  console.log('   ❌ Nenhum ZN 7-13 encontrado em 25/03!');
} else {
  maickon.forEach(r => {
    console.log(`   ${r.data}: ${r.type} - ${r.description}`);
  });
}

// Total de eventos em março
console.log('\n📊 Total de eventos em março/2026:');
const total = await sql`
  SELECT COUNT(*) as count 
  FROM events 
  WHERE userid = 1 
    AND DATE(date) >= '2026-03-01' 
    AND DATE(date) <= '2026-03-31'
`;
console.log(`   ${total[0].count} eventos`);

await sql.end();
