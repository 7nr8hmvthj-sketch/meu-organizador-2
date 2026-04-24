import { getDb } from "../server/db";

async function createVeganoUser() {
  try {
    console.log("--- 👤 CRIANDO USUÁRIO VEGANO ---");

    const db = await getDb();

    // Verificar se já existe usando sql raw query
    const existing = await db.execute(
      `SELECT * FROM "users" WHERE "openid" = 'vegano-local'`
    );

    if (existing.length > 0) {
      console.log("❌ Usuário 'vegano' já existe!");
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Name: ${existing[0].name}`);
      process.exit(0);
      return;
    }

    // Criar novo usuário com role 'admin' (igual ao seu)
    // Deixar o ID ser auto-incrementado
    const result = await db.execute(
      `INSERT INTO "users" ("openid", "name", "email", "loginmethod", "role", "createdat", "updatedat", "lastsignedin") 
       VALUES ('vegano-local', 'vegano', 'vegano@local.com', 'local', 'admin', NOW(), NOW(), NOW()) 
       RETURNING *`
    );

    console.log("✅ Usuário 'vegano' criado com sucesso!");
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Name: ${result[0].name}`);
    console.log(`   Role: ${result[0].role}`);
    console.log(`   Senha: 123`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    process.exit(1);
  }
}

createVeganoUser();
