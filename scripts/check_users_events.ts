import postgres from 'postgres';
import { ENV } from '../server/_core/env';

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('--- 🔍 VERIFICANDO USUÁRIOS E EVENTOS ---\n');

    // Get all users
    const users = await sql`SELECT id, name, email FROM users ORDER BY id`;
    console.log('📋 Usuários no banco:');
    users.forEach(u => console.log(`  - ID: ${u.id}, Nome: ${u.name}, Email: ${u.email}`));

    console.log('\n📅 Eventos de domingo (próximos 3 meses):');
    const events = await sql`
      SELECT id, date, type, description, userid
      FROM events
      WHERE EXTRACT(DOW FROM date::timestamp) = 0
      AND date >= '2026-04-01'
      AND date <= '2026-07-01'
      ORDER BY date
    `;
    
    if (events.length === 0) {
      console.log('  Nenhum evento de domingo encontrado');
    } else {
      events.forEach(e => console.log(`  - ${e.date}: ${e.type} (user: ${e.userid})`));
    }

  } catch (e) {
    console.error('❌ Erro:', e);
  } finally {
    await sql.end();
  }
}

run();
