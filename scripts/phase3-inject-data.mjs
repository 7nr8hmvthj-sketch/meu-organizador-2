import postgres from 'postgres';
import fs from 'fs/promises';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  FASE 3: INJEÇÃO DE DADOS - BACKUP PARA SUPABASE         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  // Ler backups
  console.log('📂 Lendo arquivos de backup...');
  const usersData = JSON.parse(await fs.readFile('./backup_users.json', 'utf-8'));
  const eventsData = JSON.parse(await fs.readFile('./backup_events.json', 'utf-8'));
  
  console.log(`  ✓ Users: ${usersData.length} registros`);
  console.log(`  ✓ Events: ${eventsData.length} registros\n`);
  
  // Inserir users
  console.log('👥 Inserindo usuários...');
  let usersInserted = 0;
  for (const user of usersData) {
    try {
      await sql`
        INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
        VALUES (${user.id}, ${user.openId}, ${user.name}, ${user.email}, ${user.loginMethod}, ${user.role}, ${user.createdAt}, ${user.updatedAt}, ${user.lastSignedIn})
        ON CONFLICT (id) DO NOTHING
      `;
      usersInserted++;
    } catch (err) {
      console.error(`  ✗ Erro ao inserir user ${user.id}:`, err.message);
    }
  }
  console.log(`  ✓ ${usersInserted}/${usersData.length} usuários inseridos\n`);
  
  // Inserir events em batches
  console.log('📅 Inserindo eventos em batches...');
  const batchSize = 100;
  let eventsInserted = 0;
  let eventsFailed = 0;
  
  for (let i = 0; i < eventsData.length; i += batchSize) {
    const batch = eventsData.slice(i, i + batchSize);
    
    for (const event of batch) {
      try {
        await sql`
          INSERT INTO events (id, userId, date, type, description, isShift, isPassed, passedReason, isCancelled, createdBy, createdAt, updatedAt)
          VALUES (${event.id}, ${event.userId}, ${event.date}, ${event.type}, ${event.description}, ${event.isShift}, ${event.isPassed}, ${event.passedReason}, ${event.isCancelled}, ${event.createdBy}, ${event.createdAt}, ${event.updatedAt})
          ON CONFLICT (id) DO NOTHING
        `;
        eventsInserted++;
      } catch (err) {
        eventsFailed++;
      }
    }
    
    const progress = Math.min(i + batchSize, eventsData.length);
    console.log(`  [${progress}/${eventsData.length}] ${Math.round((progress / eventsData.length) * 100)}%`);
  }
  
  console.log(`  ✓ ${eventsInserted}/${eventsData.length} eventos inseridos`);
  if (eventsFailed > 0) {
    console.log(`  ⚠ ${eventsFailed} eventos falharam (possíveis duplicatas)\n`);
  } else {
    console.log();
  }
  
  // Verificar dados finais
  console.log('✅ Verificando dados no Supabase...');
  const [usersCount] = await sql`SELECT COUNT(*) as count FROM users`;
  const [eventsCount] = await sql`SELECT COUNT(*) as count FROM events`;
  
  console.log(`  Users no banco: ${usersCount.count}`);
  console.log(`  Events no banco: ${eventsCount.count}\n`);
  
  console.log('✅ FASE 3 CONCLUÍDA - DADOS INJETADOS COM SUCESSO!\n');
  
  await sql.end();
} catch (err) {
  console.error('❌ ERRO:', err.message);
  process.exit(1);
}
