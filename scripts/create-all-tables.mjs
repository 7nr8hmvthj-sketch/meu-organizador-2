import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

const createAllTablesSql = `
-- Criar enums
CREATE TYPE IF NOT EXISTS role_enum AS ENUM ('user', 'admin');
CREATE TYPE IF NOT EXISTS category_enum AS ENUM ('fixed', 'variable');
CREATE TYPE IF NOT EXISTS theme_enum AS ENUM ('light', 'dark');

-- Tabela expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  dueDay INTEGER NOT NULL,
  category category_enum NOT NULL DEFAULT 'fixed',
  isPaid BOOLEAN DEFAULT false NOT NULL,
  paidMonth INTEGER,
  paidYear INTEGER,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela medications
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  time VARCHAR(50) NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela medication_logs
CREATE TABLE IF NOT EXISTS medication_logs (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicationId INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  takenAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  takenDate DATE NOT NULL
);

-- Tabela user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme theme_enum NOT NULL DEFAULT 'light',
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabela diary_entries
CREATE TABLE IF NOT EXISTS diary_entries (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  tags VARCHAR(500),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_expenses_userId ON expenses(userId);
CREATE INDEX IF NOT EXISTS idx_medications_userId ON medications(userId);
CREATE INDEX IF NOT EXISTS idx_medication_logs_userId ON medication_logs(userId);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medicationId ON medication_logs(medicationId);
CREATE INDEX IF NOT EXISTS idx_medication_logs_takenDate ON medication_logs(takenDate);
CREATE INDEX IF NOT EXISTS idx_diary_entries_userId ON diary_entries(userId);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date);
`;

try {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CRIANDO TODAS AS TABELAS FALTANTES NO SUPABASE          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const commands = createAllTablesSql.split(';').filter(cmd => cmd.trim());
  
  for (const cmd of commands) {
    if (cmd.trim()) {
      try {
        await sql.unsafe(cmd);
        const desc = cmd.substring(0, 40).replace(/\n/g, ' ');
        console.log(`✓ ${desc}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const desc = cmd.substring(0, 40).replace(/\n/g, ' ');
          console.log(`⚠ ${desc}... (já existe)`);
        } else {
          throw err;
        }
      }
    }
  }
  
  console.log('\n✅ TODAS AS TABELAS CRIADAS COM SUCESSO!\n');
  await sql.end();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
