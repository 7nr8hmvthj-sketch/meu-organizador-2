import postgres from 'postgres';
import { ENV } from '../server/_core/env'; 

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- 🕵️ AUDITORIA DE PLANTÕES (INCLUINDO PASSADOS) ---');

    // Busca 1: Duplicatas exatas (Mesmo dia E Mesmo Tipo)
    const duplicatasExatas = await sql`
      SELECT date, type, COUNT(*) as qtd
      FROM events 
      WHERE userid = 1 AND isshift = true 
      GROUP BY date, type 
      HAVING COUNT(*) > 1 
      ORDER BY date ASC
    `;

    console.log('\n🚨 1. DUPLICATAS EXATAS (Mesmo plantão inserido 2x no mesmo dia):');
    if (duplicatasExatas.length > 0) {
      duplicatasExatas.forEach((d: any) => {
        const dataObj = new Date(d.date);
        dataObj.setMinutes(dataObj.getMinutes() + dataObj.getTimezoneOffset());
        const dateStr = dataObj.toISOString().split('T')[0];
        console.log(`- ${dateStr}: ${d.type} (Aparece ${d.qtd} vezes)`);
      });
    } else {
      console.log('✅ Nenhuma duplicata exata encontrada.');
    }

    // Busca 2: Múltiplos plantões diferentes no mesmo dia
    const multiplosNoDia = await sql`
      SELECT date, array_agg(type) as tipos
      FROM events 
      WHERE userid = 1 AND isshift = true 
      GROUP BY date 
      HAVING COUNT(*) > 1 
      ORDER BY date ASC
    `;

    console.log('\n⚠️ 2. DIAS COM MAIS DE UM PLANTÃO DIFERENTE:');
    let multiplosCount = 0;
    multiplosNoDia.forEach((m: any) => {
      const dataObj = new Date(m.date);
      dataObj.setMinutes(dataObj.getMinutes() + dataObj.getTimezoneOffset());
      const dateStr = dataObj.toISOString().split('T')[0];
      
      const tipos: string[] = m.tipos;
      // Ignora a Terça-feira normal da usuária (ZN Manhã + ZN Tarde)
      const isTercaNormal = tipos.length === 2 && tipos.includes('ZN 7-13') && tipos.includes('ZN 13-19');
      
      if (!isTercaNormal) {
        console.log(`- ${dateStr}: ${tipos.join(' + ')}`);
        multiplosCount++;
      }
    });

    if (multiplosCount === 0) {
      console.log('✅ Nenhum conflito de plantões encontrado (Terças duplas ignoradas).');
    }

    console.log('\n---------------------------------------------------');

  } catch (e) {
    console.error('Erro ao auditar agenda:', e);
  } finally {
    await sql.end();
  }
}

run();
