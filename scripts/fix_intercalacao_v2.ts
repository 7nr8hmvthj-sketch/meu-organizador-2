import { getDb } from '../server/db';
import { events } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function run() {
  const db = getDb();
  try {
    console.log('1. Deletando antigos...');
    const { sql: sqlFn } = await import('drizzle-orm');
    const pgClient = (db as any)._.client;
    await pgClient`
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
        newEvents.push({ userId: 1, date: mondayStr, type: 'HC 13-19', isShift: true });
        newEvents.push({ userId: 1, date: tuesdayStr, type: 'ZN 7-13', isShift: true });
        newEvents.push({ userId: 1, date: tuesdayStr, type: 'ZN 13-19', isShift: true });
      } else {
        newEvents.push({ userId: 1, date: mondayStr, type: 'ZN 13-19', isShift: true });
        newEvents.push({ userId: 1, date: tuesdayStr, type: 'ZN 7-13', isShift: true });
      }

      currentDate.setDate(currentDate.getDate() + 7);
      isHcWeek = !isHcWeek;
    }

    console.log(`2. Inserindo ${newEvents.length} eventos (Sem ON CONFLICT)...`);
    await db.insert(events).values(newEvents);

    console.log('3. Validando inserção...');
    const check = await pgClient`SELECT count(*) as count FROM events WHERE date >= '2026-03-09' AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')`;
    console.log('Total inserido:', check[0]?.count || 0);
    console.log('✅ Intercalação concluída com sucesso!');

  } catch (e: any) {
    console.error('ERRO FATAL REVELADO:', e.message || String(e));
  }

  process.exit(0);
}

run();
