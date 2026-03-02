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

    console.log('1. Deletando eventos de Natação antigos a partir de hoje...');
    await sql`
      DELETE FROM events 
      WHERE userid = 1 
      AND type = 'Natação' 
      AND date >= '2026-03-02'
    `;

    const newEvents = [];
    let curr = new Date('2026-03-02T12:00:00Z');
    const end = new Date('2026-12-31T12:00:00Z');

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dow = curr.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
      let time = null;

      if (dow === 1) time = '20:45';
      else if (dow === 2) time = '11:40';
      else if (dow === 3) time = '20:45';
      else if (dow === 5) time = '20:45';
      else if (dow === 6) time = '08:00';

      if (time) {
        newEvents.push({ 
          userid: 1, 
          date: dateStr, 
          type: 'Natação', 
          description: `Natação ${time}`, 
          isshift: false 
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    console.log(`2. Inserindo ${newEvents.length} treinos de Natação corrigidos...`);
    if (newEvents.length > 0) {
      await sql`INSERT INTO events ${sql(newEvents, 'userid', 'date', 'type', 'description', 'isshift')}`;
    }

    console.log('3. Validando inserção...');
    const check = await sql`
      SELECT count(*) FROM events
      WHERE type = 'Natação'
      AND date >= '2026-03-02'
    `;
    console.log('Total de treinos de Natação até o fim do ano:', check[0].count);

  } catch (e) {
    console.error('ERRO FATAL REVELADO:', e);
  } finally {
    await sql.end();
  }
}

run();
