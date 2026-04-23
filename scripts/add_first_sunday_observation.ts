import postgres from 'postgres';
import { ENV } from '../server/_core/env';

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- ➕ ADICIONANDO 7-13 OBSERVAÇÃO NO 1º DOMINGO DE CADA MÊS ---');

    // Get user ID for USER
    const users = await sql`SELECT id FROM users WHERE name = 'USER' LIMIT 1`;
    if (!users.length) {
      console.error('❌ Usuário USER não encontrado');
      return;
    }
    const userId = users[0].id;

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
    for (const dateStr of firstSundays) {
      await sql`
        INSERT INTO events (userid, date, type, description, isshift, createdat, updatedat, createdby)
        VALUES (${userId}, ${dateStr}, '7-13 observação', '7-13 observação', true, NOW(), NOW(), 'USER')
        ON CONFLICT DO NOTHING
      `;
    }

    console.log(`✅ ${firstSundays.length} eventos de observação adicionados com sucesso!`);

  } catch (e) {
    console.error('❌ Erro ao adicionar observações:', e);
  } finally {
    await sql.end();
  }
}

run();
