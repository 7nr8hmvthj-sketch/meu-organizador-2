import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);

// Tentar diferentes timestamps para recuperar dados
// O rollback aconteceu há aproximadamente 30-40 minutos atrás
// Vamos tentar snapshots de 1 hora atrás, 2 horas atrás, etc.

const now = new Date();
const timestamps = [
  new Date(now.getTime() - 30 * 60000), // 30 minutos atrás
  new Date(now.getTime() - 45 * 60000), // 45 minutos atrás
  new Date(now.getTime() - 60 * 60000), // 1 hora atrás
  new Date(now.getTime() - 2 * 60 * 60000), // 2 horas atrás
];

console.log('=== Tentando recuperar dados do diário via snapshot ===');
console.log(`Hora atual: ${now.toISOString()}`);

for (const ts of timestamps) {
  const snapshotStr = ts.toISOString().replace('T', ' ').replace('Z', '');
  console.log(`\n--- Tentando snapshot: ${snapshotStr} ---`);
  
  try {
    const connection = await mysql.createConnection({
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
    });
    
    // Definir o snapshot
    await connection.execute(`SET tidb_snapshot = '${snapshotStr}'`);
    
    // Tentar recuperar dados do diário
    const [diaryData] = await connection.execute(
      `SELECT id, userId, DATE(date) as date, title, SUBSTRING(content, 1, 100) as content_preview, createdAt 
       FROM diary_entries ORDER BY date DESC LIMIT 10`
    );
    
    if (diaryData.length > 0) {
      console.log(`✅ SUCESSO! Encontrados ${diaryData.length} registros do diário:`);
      diaryData.forEach(row => {
        console.log(`  ID ${row.id}: ${row.date} | ${row.title} | ${row.content_preview}`);
      });
      
      // Se encontrou dados, salvar para recuperação
      console.log('\n📝 Salvando dados recuperados...');
      const [allDiary] = await connection.execute(
        `SELECT * FROM diary_entries ORDER BY date ASC`
      );
      
      // Salvar em arquivo JSON para referência
      const fs = await import('fs');
      fs.writeFileSync(
        '/tmp/recovered_diary.json',
        JSON.stringify(allDiary, null, 2)
      );
      console.log('Dados salvos em /tmp/recovered_diary.json');
      
      await connection.end();
      break;
    } else {
      console.log('❌ Nenhum registro encontrado neste snapshot');
    }
    
    await connection.end();
  } catch (err) {
    console.log(`❌ Erro: ${err.message}`);
  }
}

console.log('\n=== Verificação de outros snapshots disponíveis ===');
try {
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });
  
  // Resetar snapshot para ver dados atuais
  await connection.execute(`SET tidb_snapshot = ''`);
  
  // Verificar se há informações sobre snapshots disponíveis
  const [info] = await connection.execute(`SHOW VARIABLES LIKE 'tidb_gc_life_time'`);
  console.log('Tempo de vida do GC (retenção de dados):');
  if (info.length > 0) {
    console.log(`  ${info[0].Variable_name}: ${info[0].Value}`);
  }
  
  await connection.end();
} catch (err) {
  console.log(`Erro ao verificar GC: ${err.message}`);
}
