import mysql from 'mysql2/promise';

const dbUrl = new URL(process.env.DATABASE_URL);
console.log('DB Host:', dbUrl.hostname);
console.log('DB Name:', dbUrl.pathname.slice(1));

const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Listar tabelas
const [tables] = await connection.execute(`SHOW TABLES`);
console.log('\nTABELAS:');
tables.forEach(r => console.log(`  ${Object.values(r)[0]}`));

// Contar registros em cada tabela
for (const t of tables) {
  const tableName = Object.values(t)[0];
  const [count] = await connection.execute(`SELECT COUNT(*) as c FROM \`${tableName}\``);
  console.log(`  ${tableName}: ${count[0].c} registros`);
}

await connection.end();
