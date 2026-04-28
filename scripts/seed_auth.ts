/**
 * Seed Auth Script - Migra usuários do VALID_CREDENTIALS para o banco de dados
 * com senhas criptografadas usando bcrypt.
 * 
 * Cria tabela app_users (separada da tabela users do OAuth) com:
 * - id, username, password_hash, role, user_id (referência interna)
 */
import { getDb } from "../server/db";
import bcrypt from "bcryptjs";

const VALID_CREDENTIALS = {
  "USER": { password: "Wert123.", role: "admin", userId: 1 },
  "JESSICA": { password: "123", role: "trainer", userId: 150023 },
  "ISA": { password: "123", role: "trainer", userId: 150024 },
  "VEGANO": { password: "123", role: "admin", userId: 2 },
};

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Falha ao conectar ao banco de dados");
    process.exit(1);
  }

  console.log("=== Seed Auth: Migrando usuários para o banco ===\n");

  // 1. Criar tabela app_users se não existir
  console.log("1. Criando tabela app_users...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        user_id INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("   ✅ Tabela app_users criada/verificada\n");
  } catch (error) {
    console.error("   ❌ Erro ao criar tabela:", error);
    process.exit(1);
  }

  // 2. Inserir usuários com hash
  console.log("2. Inserindo usuários com senhas criptografadas...");
  const SALT_ROUNDS = 10;

  for (const [username, creds] of Object.entries(VALID_CREDENTIALS)) {
    try {
      const hash = await bcrypt.hash(creds.password, SALT_ROUNDS);
      
      await db.execute(`
        INSERT INTO app_users (username, password_hash, role, user_id)
        VALUES ('${username}', '${hash}', '${creds.role}', ${creds.userId})
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          user_id = EXCLUDED.user_id,
          updated_at = NOW()
      `);
      
      console.log(`   ✅ ${username} (role: ${creds.role}, userId: ${creds.userId}) - hash gerado`);
    } catch (error) {
      console.error(`   ❌ Erro ao inserir ${username}:`, error);
    }
  }

  // 3. Verificar inserção
  console.log("\n3. Verificando usuários no banco...");
  try {
    const result = await db.execute(`SELECT id, username, role, user_id FROM app_users ORDER BY id`);
    console.log("   Usuários no banco:");
    for (const row of (result as any).rows || (result as any)) {
      console.log(`   - ${row.username} (role: ${row.role}, userId: ${row.user_id})`);
    }
  } catch (error) {
    console.error("   ❌ Erro ao verificar:", error);
  }

  // 4. Testar validação de senha
  console.log("\n4. Testando validação de senha...");
  try {
    const result = await db.execute(`SELECT username, password_hash FROM app_users WHERE username = 'USER'`);
    const rows = (result as any).rows || (result as any);
    if (rows.length > 0) {
      const isValid = await bcrypt.compare("Wert123.", rows[0].password_hash);
      console.log(`   ✅ Validação USER com "Wert123.": ${isValid ? "SUCESSO" : "FALHOU"}`);
      
      const isInvalid = await bcrypt.compare("senhaerrada", rows[0].password_hash);
      console.log(`   ✅ Validação USER com "senhaerrada": ${isInvalid ? "FALHOU (deveria ser false)" : "CORRETO (rejeitou)"}`);
    }
  } catch (error) {
    console.error("   ❌ Erro ao testar:", error);
  }

  console.log("\n=== Seed Auth concluído com sucesso! ===");
  process.exit(0);
}

main().catch(console.error);
