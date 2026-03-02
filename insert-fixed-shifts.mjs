import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require', {
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

async function insertShift(date, type, description) {
  try {
    const result = await sql`
      INSERT INTO events (userid, date, type, description, isshift, createdby)
      VALUES (1, ${date}, ${type}, ${description}, true, 'USER')
      RETURNING id, date, type
    `;
    console.log(`  ✅ Inserido: ${date} - ${type}`);
    return result;
  } catch (error) {
    console.log(`  ❌ Erro ao inserir ${date} - ${type}: ${error.message}`);
    return null;
  }
}

console.log('🔧 Inserindo plantões fixos em março/2026\n');

// 1. Dia 25/03: ZN 7-13 - Maickon
console.log('1️⃣ Dia 25/03 (Quarta): ZN 7-13 - Maickon');
await insertShift('2026-03-25', 'ZN 7-13', 'ZN 7-13 - Maickon');

// 2. Quintas-feiras: HC 7-13
console.log('\n2️⃣ Todas as Quintas-feiras: HC 7-13');
const quintas = ['2026-03-05', '2026-03-12', '2026-03-19', '2026-03-26'];
for (const data of quintas) {
  await insertShift(data, 'HC 7-13', 'HC 7-13');
}

// 3. Primeira sexta (06/03): Noturno 19-07
console.log('\n3️⃣ Primeira Sexta (06/03): Noturno 19-07');
await insertShift('2026-03-06', 'Noturno 19-07', 'Noturno 19-07');

// 4. Quinta sexta (31/03): Noturno 19-01
console.log('\n4️⃣ Quinta Sexta (31/03): Noturno 19-01');
await insertShift('2026-03-31', 'Noturno 19-01', 'Noturno 19-01');

console.log('\n✅ Verificando inserções...');
const inserted = await sql`
  SELECT DATE(date) as data, type, description 
  FROM events 
  WHERE userid = 1 
    AND (
      DATE(date) = '2026-03-25' OR
      DATE(date) IN ('2026-03-05', '2026-03-12', '2026-03-19', '2026-03-26') OR
      DATE(date) = '2026-03-06' OR
      DATE(date) = '2026-03-31'
    )
    AND (type LIKE '%HC%' OR type LIKE '%ZN%' OR type LIKE '%Noturno%')
  ORDER BY DATE(date), type
`;

console.log('\n📊 Eventos inseridos:');
inserted.forEach(r => {
  console.log(`   ${r.data}: ${r.type}`);
});

console.log(`\n🎉 Total: ${inserted.length} eventos`);

await sql.end();
