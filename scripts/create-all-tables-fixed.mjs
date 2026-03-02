import postgres from 'postgres';

const supabaseUrl = 'postgresql://postgres.ouqticpigsvmcpjjowfz:*Y_WZ4yPFkFajr%26@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = postgres(supabaseUrl, {
  ssl: 'require',
  max: 1,
});

try {
  console.log('Criando tabelas...\n');
  
  // Criar enums
  await sql.unsafe(`CREATE TYPE IF NOT EXISTS category_enum AS ENUM ('fixed', 'variable')`).catch(() => null);
  await sql.unsafe(`CREATE TYPE IF NOT EXISTS theme_enum AS ENUM ('light', 'dark')`).catch(() => null);
  console.log('✓ Enums criados');
  
  // Tabela expenses
  await sql.unsafe(`
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
    )
  `).catch(() => null);
  console.log('✓ Tabela expenses');
  
  // Tabela medications
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS medications (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      time VARCHAR(50) NOT NULL,
      order_field INTEGER DEFAULT 0 NOT NULL,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `).catch(() => null);
  console.log('✓ Tabela medications');
  
  // Tabela medication_logs
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      medicationId INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      takenAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      takenDate DATE NOT NULL
    )
  `).catch(() => null);
  console.log('✓ Tabela medication_logs');
  
  // Tabela user_preferences
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      theme theme_enum NOT NULL DEFAULT 'light',
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `).catch(() => null);
  console.log('✓ Tabela user_preferences');
  
  // Tabela diary_entries
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS diary_entries (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      title VARCHAR(255),
      content TEXT,
      tags VARCHAR(500),
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `).catch(() => null);
  console.log('✓ Tabela diary_entries');
  
  console.log('\n✅ TODAS AS TABELAS CRIADAS!\n');
  await sql.end();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
