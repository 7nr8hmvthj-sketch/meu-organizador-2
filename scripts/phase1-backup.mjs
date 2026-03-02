import mysql from 'mysql2/promise';
import fs from 'fs/promises';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  FASE 1: BACKUP FRIO - DUMP DE DADOS DO TIDB             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log('📋 Lendo tabela users...');
const [users] = await connection.execute('SELECT * FROM users');
console.log(`  ✓ ${users.length} registros de users`);

console.log('📋 Lendo tabela events...');
const [events] = await connection.execute('SELECT * FROM events');
console.log(`  ✓ ${events.length} registros de events`);

console.log('\n💾 Salvando backups em JSON...');
await fs.writeFile(
  '/home/ubuntu/meu-organizador/backup_users.json',
  JSON.stringify(users, null, 2)
);
console.log('  ✓ backup_users.json criado');

await fs.writeFile(
  '/home/ubuntu/meu-organizador/backup_events.json',
  JSON.stringify(events, null, 2)
);
console.log('  ✓ backup_events.json criado');

console.log('\n✅ BACKUP FRIO CONCLUÍDO');
console.log(`  Users: ${users.length}`);
console.log(`  Events: ${events.length}`);
console.log(`  Total: ${users.length + events.length} registros\n`);

await connection.end();
