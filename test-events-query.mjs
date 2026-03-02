import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

// Workaround para TypeScript
const { events } = schema;

const DATABASE_URL = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

console.log('🔍 Testando query de eventos com Drizzle ORM...');

try {
  const sqlClient = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    max: 10,
    idle_timeout: 20,
    socket_timeout: 30,
    connect_timeout: 10
  });

  const db = drizzle(sqlClient, { schema });

  // Teste 1: Query raw SQL
  console.log('\n📝 Teste 1: Query raw SQL');
  const rawResult = await sqlClient`
    SELECT id, date, type FROM events WHERE userid = 1 LIMIT 3
  `;
  console.log('Raw SQL result:', rawResult);

  // Teste 2: Query com Drizzle
  console.log('\n📝 Teste 2: Query com Drizzle ORM');
  const drizzleResult = await db
    .select()
    .from(schema.events)
    .where(sql`${schema.events.userId} = ${1}`)
    .limit(3);
  console.log('Drizzle result:', drizzleResult);

  // Teste 3: Query com date range
  console.log('\n📝 Teste 3: Query com date range');
  const rangeResult = await db
    .select()
    .from(schema.events)
    .where(
      sql`${schema.events.userId} = ${1} AND DATE(${schema.events.date}) >= ${'2026-03-01'} AND DATE(${schema.events.date}) <= ${'2026-03-31'}`
    )
    .limit(5);
  console.log('Range result:', rangeResult);

  // Teste 4: Verificar nomes de colunas
  console.log('\n📝 Teste 4: Verificar estrutura de dados');
  if (rangeResult.length > 0) {
    console.log('Primeiro evento:', rangeResult[0]);
    console.log('Chaves:', Object.keys(rangeResult[0]));
  }

  await sqlClient.end();
  console.log('\n✅ Testes concluídos');
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
