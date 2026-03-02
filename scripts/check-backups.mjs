import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log('=== Verificando informações do banco de dados ===');
console.log(`Host: ${dbUrl.hostname}`);
console.log(`Database: ${dbUrl.pathname.slice(1)}`);

// Verificar se há tabelas de sistema que possam conter informações de backup
const [tables] = await connection.execute(`SHOW TABLES`);
console.log('\nTabelas disponíveis:');
tables.forEach(t => console.log(`  ${Object.values(t)[0]}`));

// Verificar se há informações sobre backups nas variáveis do sistema
const [vars] = await connection.execute(`SHOW VARIABLES LIKE '%backup%'`);
console.log('\nVariáveis de backup:');
if (vars.length > 0) {
  vars.forEach(v => console.log(`  ${v.Variable_name}: ${v.Value}`));
} else {
  console.log('  Nenhuma variável de backup encontrada');
}

// Verificar logs
const [logs] = await connection.execute(`SHOW VARIABLES LIKE '%log%'`);
console.log('\nVariáveis de log:');
if (logs.length > 0) {
  logs.slice(0, 5).forEach(l => console.log(`  ${l.Variable_name}: ${l.Value}`));
} else {
  console.log('  Nenhuma variável de log encontrada');
}

// Verificar se há informações de replicação ou ponto de recuperação
const [binlog] = await connection.execute(`SHOW MASTER STATUS`).catch(() => [[]]);
console.log('\nStatus do binlog:');
if (binlog.length > 0) {
  console.log(`  Arquivo: ${binlog[0].File}`);
  console.log(`  Posição: ${binlog[0].Position}`);
} else {
  console.log('  Binlog não disponível ou não configurado');
}

// Verificar informações do banco
const [dbInfo] = await connection.execute(`SELECT DATABASE(), VERSION()`);
console.log('\nInformações do banco:');
console.log(`  Database: ${dbInfo[0]['DATABASE()']}`);
console.log(`  Versão: ${dbInfo[0]['VERSION()']}`);

// Tentar verificar se há snapshots ou backups mencionados em variáveis
const [allVars] = await connection.execute(`SHOW VARIABLES`);
const relevantVars = allVars.filter(v => 
  v.Variable_name.toLowerCase().includes('snapshot') ||
  v.Variable_name.toLowerCase().includes('restore') ||
  v.Variable_name.toLowerCase().includes('recovery')
);
console.log('\nVariáveis relevantes para recuperação:');
if (relevantVars.length > 0) {
  relevantVars.forEach(v => console.log(`  ${v.Variable_name}: ${v.Value}`));
} else {
  console.log('  Nenhuma variável de recuperação encontrada');
}

await connection.end();
