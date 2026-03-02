import postgres from 'postgres';
import { ENV } from '../server/_core/env'; 

const sql = postgres(ENV.databaseUrl, {
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  try {
    console.log('0. Sincronizando o contador de IDs...');
    await sql`SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE((SELECT MAX(id) FROM events), 1))`;

    console.log('1. Limpando possíveis duplicatas do 2º e 3º sábados...');
    await sql`
      DELETE FROM events 
      WHERE userid = 1 
      AND date >= '2026-03-02' 
      AND type = 'ZN 7-13' 
      AND extract(dow from date) = 6 
      AND extract(day from date) >= 8 
      AND extract(day from date) <= 21
    `;

    const newEvents = [];
    let curr = new Date('2026-03-02T12:00:00Z');
    const end = new Date('2026-12-31T12:00:00Z');

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dow = curr.getDay(); // 6 = Sábado
      const dateNum = curr.getDate();

      // 2º Sábado (dias 8 a 14) e 3º Sábado (dias 15 a 21)
      if (dow === 6 && dateNum >= 8 && dateNum <= 21) {
        newEvents.push({ userid: 1, date: dateStr, type: 'ZN 7-13', description: null, isshift: true });
      }

      curr.setDate(curr.getDate() + 1);
    }

    console.log(`2. Inserindo ${newEvents.length} plantões de sábado...`);
    if (newEvents.length > 0) {
      await sql`INSERT INTO events ${sql(newEvents, 'userid', 'date', 'type', 'description', 'isshift')}`;
    }

    console.log('3. Validando inserção...');
    const check = await sql`
      SELECT count(*) FROM events
      WHERE date >= '2026-03-02'
      AND type = 'ZN 7-13'
      AND extract(dow from date) = 6
      AND extract(day from date) >= 8
      AND extract(day from date) <= 21
    `;
    console.log('Total de 2º e 3º sábados presentes:', check[0].count);

  } catch (e) {
    console.error('ERRO FATAL REVELADO:', e);
  } finally {
    await sql.end();
  }
}

run();
