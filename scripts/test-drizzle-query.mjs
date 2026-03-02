import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './drizzle/schema.ts';

const queryClient = postgres('postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres', {
  ssl: 'require',
  prepare: false
});

const db = drizzle(queryClient, { schema });

try {
  console.log('Testando query com Drizzle...\n');
  
  const events = await db.select().from(schema.events).limit(5);
  console.log('Eventos encontrados:', events.length);
  console.log('Primeira amostra:', events[0]);
  
  await queryClient.end();
} catch (err) {
  console.error('Erro:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}
