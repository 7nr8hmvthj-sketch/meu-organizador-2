import postgres from 'postgres';
import { ENV } from '../server/_core/env';

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- EXTRATO DE PLANTÕES (ABRIL E MAIO 2026) ---\n');

    const events = await sql`
      SELECT date, type, extract(dow from date) as dow
      FROM events 
      WHERE userid = 1 
      AND isshift = true 
      AND date >= '2026-04-01' 
      AND date <= '2026-05-31'
      ORDER BY date ASC
    `;

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    events.forEach(e => {
      // Ajuste de fuso horário para exibição correta da data
      const d = new Date(e.date);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const dateStr = d.toISOString().split('T')[0];
      console.log(`${dateStr} (${diasSemana[e.dow]}): ${e.type}`);
    });

    console.log('\n----------------------------------------------');
    console.log(`Total de plantões no período: ${events.length}`);

  } catch (e) {
    console.error('Erro ao ler agenda:', e);
  } finally {
    await sql.end();
  }
}

run();
