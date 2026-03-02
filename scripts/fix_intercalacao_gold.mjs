import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Usa a URL limpa e delega o SSL e o pooler para as opções internas
const dbUrl = process.env.DATABASE_URL || '';
const sql = postgres(dbUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false // Necessário para o pooler do Supabase
});

async function run() {
  try {
    console.log('1. Deletando segundas e terças antigas...');
    await sql`
      DELETE FROM events
      WHERE userid = 1
      AND extract(dow from date) IN (1, 2)
      AND date >= '2026-03-09'
      AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')
    `;

    const newEvents = [];
    let currentDate = new Date('2026-03-09T12:00:00Z');
    const endDate = new Date('2026-12-31T12:00:00Z');
    let isHcWeek = true;

    while (currentDate <= endDate) {
      const mondayStr = currentDate.toISOString().split('T')[0];
      const tuesday = new Date(currentDate);
      tuesday.setDate(tuesday.getDate() + 1);
      const tuesdayStr = tuesday.toISOString().split('T')[0];

      if (isHcWeek) {
        newEvents.push({ userid: 1, date: mondayStr, type: 'HC 13-19', isshift: true });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 7-13', isshift: true });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 13-19', isshift: true });
      } else {
        newEvents.push({ userid: 1, date: mondayStr, type: 'ZN 13-19', isshift: true });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 7-13', isshift: true });
      }

      currentDate.setDate(currentDate.getDate() + 7);
      isHcWeek = !isHcWeek;
    }

    console.log(`2. Inserindo ${newEvents.length} eventos via Postgres...`);
    await sql`INSERT INTO events ${sql(newEvents, 'userid', 'date', 'type', 'isshift')}`;

    console.log('3. Validando inserção...');
    const check = await sql`SELECT count(*) FROM events WHERE date >= '2026-03-09' AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')`;
    console.log('Total de eventos base presentes agora:', check[0].count);

  } catch (e) {
    console.error('ERRO FATAL REVELADO:', e);
  } finally {
    await sql.end();
  }
}

run();
