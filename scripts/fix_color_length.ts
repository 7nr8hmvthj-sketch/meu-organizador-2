import postgres from 'postgres';
import { ENV } from '../server/_core/env'; 

const sql = postgres(ENV.databaseUrl, { 
  ssl: { rejectUnauthorized: false }, 
  prepare: false 
});

async function run() {
  try {
    console.log('--- 🔧 EXPANDINDO COLUNA COLOR ---');
    await sql`ALTER TABLE events ALTER COLUMN color TYPE VARCHAR(255)`;
    console.log('✅ Coluna color expandida para 255 caracteres!');
  } catch (e) { 
    console.error('Erro ao expandir coluna:', e); 
  } finally { 
    await sql.end(); 
  }
}

run();
