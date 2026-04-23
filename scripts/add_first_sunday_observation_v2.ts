import postgres from 'postgres';
import { ENV } from '../server/_core/env';

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- ➕ ADICIONANDO 7-13 OBSERVAÇÃO NO 1º DOMINGO DE CADA MÊS ---');

    const userId = 1; // Brendon Almeida Nunes

    // Generate first Sundays from April 2026 to December 2026
    const firstSundays = [];
    for (let month = 3; month <= 11; month++) { // April (3) to December (11)
      const year = 2026;
      // Find first day of month
      let date = new Date(Date.UTC(year, month, 1));
      // Find first Sunday
      while (date.getUTCDay() !== 0) {
        date.setUTCDate(date.getUTCDate() + 1);
      }
      const dateStr = date.toISOString().split('T')[0];
      firstSundays.push(dateStr);
    }

    console.log(`📅 Primeiros domingos encontrados: ${firstSundays.join(', ')}`);

    // Insert events for each first Sunday
    let inserted = 0;
    for (const dateStr of firstSundays) {
      try {
        await sql`
          INSERT INTO events (userid, date, type, description, isshift, createdat, updatedat, createdby)
          VALUES (${userId}, ${dateStr}, '7-13 observação', '7-13 observação', true, NOW(), NOW(), 'USER')
        `;
        inserted++;
      } catch (e) {
        console.log(`  ⚠️ ${dateStr}: Evento pode já existir`);
      }
    }

    console.log(`✅ ${inserted} eventos de observação adicionados com sucesso!`);

  } catch (e) {
    console.error('❌ Erro ao adicionar observações:', e);
  } finally {
    await sql.end();
  }
}

run();
