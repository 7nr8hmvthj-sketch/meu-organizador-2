import postgres from 'postgres';
import { ENV } from '../server/_core/env'; 

const sql = postgres(ENV.databaseUrl, { 
  ssl: { rejectUnauthorized: false },
  prepare: false 
});

async function run() {
  try {
    console.log('--- 🔍 VALIDANDO MIGRAÇÃO ---');
    
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name IN ('starttime', 'endtime', 'color')
      ORDER BY column_name
    `;
    
    if (result.length === 3) {
      console.log('✅ TODAS AS 3 COLUNAS FORAM CRIADAS COM SUCESSO!');
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log(`⚠️ Apenas ${result.length} de 3 colunas encontradas:`);
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (e) {
    console.error('Erro na validação:', e);
  } finally {
    await sql.end();
  }
}

run();
