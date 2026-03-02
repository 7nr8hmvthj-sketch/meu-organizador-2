import postgres from 'postgres';

async function run() {
  const sql = postgres('postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require', {
    ssl: { rejectUnauthorized: false },
    prepare: false,
  });

  try {
    console.log('1. Deletando antigos...');
    await sql.unsafe(`
      DELETE FROM events
      WHERE userid = 1
      AND extract(dow from date) IN (1, 2)
      AND date >= '2026-03-09'
      AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')
    `);
    console.log('✅ Antigos deletados');

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
        newEvents.push({ userid: 1, date: mondayStr, type: 'HC 13-19', isshift: true, createdby: 'SYSTEM' });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 7-13', isshift: true, createdby: 'SYSTEM' });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 13-19', isshift: true, createdby: 'SYSTEM' });
      } else {
        newEvents.push({ userid: 1, date: mondayStr, type: 'ZN 13-19', isshift: true, createdby: 'SYSTEM' });
        newEvents.push({ userid: 1, date: tuesdayStr, type: 'ZN 7-13', isshift: true, createdby: 'SYSTEM' });
      }

      currentDate.setDate(currentDate.getDate() + 7);
      isHcWeek = !isHcWeek;
    }

    console.log(`2. Inserindo ${newEvents.length} eventos...`);
    
    // Inserir em lotes
    const batchSize = 20;
    for (let i = 0; i < newEvents.length; i += batchSize) {
      const batch = newEvents.slice(i, i + batchSize);
      const values = batch.map(e => `('${e.userid}', '${e.date}', '${e.type}', ${e.isshift}, '${e.createdby}')`).join(',');
      
      await sql.unsafe(`
        INSERT INTO events (userid, date, type, isshift, createdby)
        VALUES ${values}
      `);
    }
    console.log('✅ Eventos inseridos');

    console.log('3. Validando inserção...');
    const check = await sql`SELECT count(*) as count FROM events WHERE date >= '2026-03-09' AND type IN ('HC 13-19', 'ZN 13-19', 'ZN 7-13', 'HC 7-13')`;
    console.log('Total inserido:', check[0].count);
    console.log('✅ Intercalação concluída com sucesso!');

  } catch (e) {
    console.error('ERRO FATAL REVELADO:', e.message || String(e));
  }

  await sql.end();
  process.exit(0);
}

run();
