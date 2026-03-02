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

    console.log('1. Limpando possíveis duplicatas antigas...');
    await sql`DELETE FROM events WHERE userid = 1 AND date >= '2026-03-02' AND type = 'HC 7-13' AND extract(dow from date) = 4`;
    await sql`DELETE FROM events WHERE userid = 1 AND date >= '2026-03-02' AND type IN ('Noturno 19-07', 'Noturno 19-01') AND extract(dow from date) = 5`;
    await sql`DELETE FROM events WHERE userid = 1 AND date >= '2026-03-02' AND type = 'ZN 7-13' AND extract(dow from date) = 6`;
    await sql`DELETE FROM events WHERE userid = 1 AND date = '2026-03-25' AND type = 'ZN 7-13'`;

    const newEvents = [];

    // O plantão específico do Maickon
    newEvents.push({ userid: 1, date: '2026-03-25', type: 'ZN 7-13', description: 'Maickon', isshift: true });

    let curr = new Date('2026-03-02T12:00:00Z');
    const end = new Date('2026-12-31T12:00:00Z');

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dow = curr.getDay(); // 0=Sun, 4=Thu, 5=Fri, 6=Sat
      const dateNum = curr.getDate();

      if (dow === 4) { // Quintas
        newEvents.push({ userid: 1, date: dateStr, type: 'HC 7-13', description: null, isshift: true });
      } else if (dow === 5) { // Sextas
        if (dateNum <= 7) { // Primeira sexta
          newEvents.push({ userid: 1, date: dateStr, type: 'Noturno 19-07', description: null, isshift: true });
        } else if (dateNum >= 29) { // Quinta sexta
          newEvents.push({ userid: 1, date: dateStr, type: 'Noturno 19-01', description: null, isshift: true });
        }
      } else if (dow === 6) { // Sábados
        if (dateNum >= 29) { // Quinto sábado
          newEvents.push({ userid: 1, date: dateStr, type: 'ZN 7-13', description: null, isshift: true });
        }
      }

      curr.setDate(curr.getDate() + 1);
    }

    console.log(`2. Inserindo ${newEvents.length} plantões fixos...`);
    await sql`INSERT INTO events ${sql(newEvents, 'userid', 'date', 'type', 'description', 'isshift')}`;

    console.log('3. Validando inserção...');
    const check = await sql`SELECT count(*) FROM events WHERE date >= '2026-03-02' AND (type IN ('HC 7-13', 'Noturno 19-07', 'Noturno 19-01') OR (type = 'ZN 7-13' AND extract(dow from date) IN (3, 6)))`;
    console.log('Total de eventos fixos inseridos com sucesso:', check[0].count);

  } catch (e) {
    console.error('ERRO FATAL REVELADO:', e);
  } finally {
    await sql.end();
  }
}

run();
