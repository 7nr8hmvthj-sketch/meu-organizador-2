import mysql from 'mysql2/promise';
import fs from 'fs';

const dbUrl = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log('=== TAREFA 1: EXTRAÇÃO DE SOBREVIVENTES ===\n');

// Query completa de todos os eventos
const [events] = await connection.execute(
  `SELECT 
    id, userId, DATE_FORMAT(date, '%Y-%m-%d') as date, 
    type, description, isShift, isPassed, passedReason, isCancelled,
    createdAt, updatedAt
   FROM events 
   ORDER BY date ASC, type ASC`
);

console.log(`✅ Total de eventos encontrados: ${events.length}`);

// Salvar em JSON
const output = {
  timestamp: new Date().toISOString(),
  total_eventos: events.length,
  eventos: events
};

fs.writeFileSync(
  '/home/ubuntu/meu-organizador/eventos_sobreviventes.json',
  JSON.stringify(output, null, 2)
);

console.log(`📁 Arquivo salvo: /home/ubuntu/meu-organizador/eventos_sobreviventes.json`);

// Resumo por tipo
const typeCount = {};
events.forEach(e => {
  typeCount[e.type] = (typeCount[e.type] || 0) + 1;
});

console.log('\n📊 Resumo por tipo:');
Object.entries(typeCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

await connection.end();
