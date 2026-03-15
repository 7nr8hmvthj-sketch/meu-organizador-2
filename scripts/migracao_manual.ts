import postgres from 'postgres';
import { ENV } from '../server/_core/env'; 

const sql = postgres(ENV.databaseUrl, { 
  ssl: { rejectUnauthorized: false }, // Isso contorna o erro de TLS do Supabase
  prepare: false 
});

async function run() {
  try {
    console.log('--- 🛠️ INICIANDO MIGRAÇÃO MANUAL (BYPASS DRIZZLE) ---');
    
    console.log('1. Adicionando coluna starttime...');
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS starttime VARCHAR(5)`;
    
    console.log('2. Adicionando coluna endtime...');
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS endtime VARCHAR(5)`;
    
    console.log('3. Adicionando coluna color...');
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS color VARCHAR(50)`;
    
    console.log('✅ COLUNAS INJETADAS COM SUCESSO!');
    console.log('O banco de dados agora está pronto para a Fase 2 (Frontend).');
    
  } catch (e) {
    console.error('Erro na migração manual:', e);
  } finally {
    await sql.end();
  }
}

run();
