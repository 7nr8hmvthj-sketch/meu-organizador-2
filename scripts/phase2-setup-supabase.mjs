import pkg from 'pg';
import fs from 'fs/promises';

const { Client } = pkg;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  FASE 2: SETUP SUPABASE - APLICAR SCHEMA                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// URL do Supabase com & encodado como %26
const supabaseUrl = 'postgresql://postgres:%Y_WZ4yPFkFajr%26@db.ouqticpigsvmcpjjowfz.supabase.co:5432/postgres';

const client = new Client({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false },
});

console.log('🔗 Conectando ao Supabase PostgreSQL...');
await client.connect();
console.log('  ✓ Conectado com sucesso\n');

// Schema SQL para criar as tabelas
const schemaSql = `
-- Tabela users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(255),
  description TEXT,
  isShift BOOLEAN DEFAULT FALSE,
  isPassed BOOLEAN DEFAULT FALSE,
  passedReason VARCHAR(255),
  isCancelled BOOLEAN DEFAULT FALSE,
  createdBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_userId ON events(userId);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`;

console.log('📋 Criando tabelas no Supabase...');
try {
  await client.query(schemaSql);
  console.log('  ✓ Tabelas criadas com sucesso\n');
} catch (err) {
  console.log('  ⚠ Tabelas podem já existir (erro esperado):', err.message.split('\n')[0]);
  console.log('  ✓ Continuando...\n');
}

// Verificar se as tabelas existem
console.log('✅ Verificando estrutura das tabelas...');
const [usersTable] = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`);

const [eventsTable] = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'events'
  ORDER BY ordinal_position
`);

console.log('  Users columns:');
usersTable.rows.forEach(row => {
  console.log(`    - ${row.column_name}: ${row.data_type}`);
});

console.log('  Events columns:');
eventsTable.rows.forEach(row => {
  console.log(`    - ${row.column_name}: ${row.data_type}`);
});

console.log('\n✅ FASE 2 CONCLUÍDA - SUPABASE PRONTO PARA RECEBER DADOS\n');

await client.end();
