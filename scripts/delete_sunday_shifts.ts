import postgres from 'postgres';
import { ENV } from '../server/_core/env';

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- 🗑️ DELETANDO PLANTÕES DE DOMINGO 7-13 A PARTIR DE 26/04 ---');

    // Delete all Sunday 7-13 shifts from 2026-04-26 onwards
    // Sunday = day 0 in JavaScript, but we need to check the actual date
    const result = await sql`
      DELETE FROM events
      WHERE 
        userid = (SELECT id FROM users WHERE name = 'USER' LIMIT 1)
        AND date >= '2026-04-26'
        AND EXTRACT(DOW FROM date::timestamp) = 0
        AND type LIKE '%7-13%'
        AND type NOT LIKE '%observação%'
    `;

    console.log(`✅ ${result.count} plantões de domingo deletados com sucesso!`);
    console.log('Próximo passo: executar script de adição de observações');

  } catch (e) {
    console.error('❌ Erro ao deletar plantões:', e);
  } finally {
    await sql.end();
  }
}

run();
