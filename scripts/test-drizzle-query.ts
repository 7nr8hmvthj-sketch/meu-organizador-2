import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';

const queryClient = postgres('postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres', {
  ssl: 'require',
  prepare: false
});

const db = drizzle(queryClient, { schema });

(async () => {
  try {
    console.log('Testando query com Drizzle...\n');
    
    const events = await db.select().from(schema.events).limit(5);
    console.log('Eventos encontrados:', events.length);
    console.log('Primeira amostra:', events[0]);
    
    await queryClient.end();
  } catch (err: any) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
