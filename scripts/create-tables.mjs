import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

const createTablesSql = `
-- Criar enum para role
CREATE TYPE role_enum AS ENUM ('user', 'admin');

-- Criar tabela users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role role_enum NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar tabela events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(100),
  description TEXT,
  isShift BOOLEAN DEFAULT true NOT NULL,
  isPassed BOOLEAN DEFAULT false NOT NULL,
  passedReason TEXT,
  isCancelled BOOLEAN DEFAULT false NOT NULL,
  createdBy VARCHAR(50),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_events_userId ON events(userId);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`;

try {
  console.log('Criando tabelas...');
  
  // Executar cada comando separadamente
  const commands = createTablesSql.split(';').filter(cmd => cmd.trim());
  
  for (const cmd of commands) {
    if (cmd.trim()) {
      try {
        await sql.unsafe(cmd);
        console.log(`✓ ${cmd.substring(0, 50)}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠ ${cmd.substring(0, 50)}... (já existe)`);
        } else {
          throw err;
        }
      }
    }
  }
  
  console.log('\n✅ Tabelas criadas com sucesso!');
  await sql.end();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
