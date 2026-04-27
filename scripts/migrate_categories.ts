import { getDb } from "../server/db";

async function migrateCategories() {
  console.log("--- 🗄️ MIGRAÇÃO: Criando tabela categories ---");

  const db = await getDb();
  if (!db) {
    console.error("❌ Não foi possível conectar ao banco de dados");
    process.exit(1);
  }

  try {
    // Verificar se tabela já existe
    const tableCheck = await db.execute(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories')`
    );
    
    const exists = tableCheck[0]?.exists;
    if (exists) {
      console.log("⚠️ Tabela 'categories' já existe. Pulando criação.");
    } else {
      // Criar tabela categories
      await db.execute(`
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          color VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'outro',
          icon VARCHAR(50),
          isdefault BOOLEAN NOT NULL DEFAULT false,
          sortorder INTEGER NOT NULL DEFAULT 0,
          createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ Tabela 'categories' criada com sucesso!");
    }

    // Seed: Popular com categorias existentes
    const existingCategories = await db.execute(`SELECT COUNT(*) as count FROM categories`);
    const count = parseInt(existingCategories[0]?.count || "0");
    
    if (count > 0) {
      console.log(`⚠️ Tabela já tem ${count} categorias. Pulando seed.`);
    } else {
      console.log("📦 Populando categorias padrão...");
      
      await db.execute(`
        INSERT INTO categories (name, color, type, icon, isdefault, sortorder) VALUES
        ('HC 7-13', 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200', 'plantao', 'Hospital', true, 1),
        ('HC 13-19', 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border-red-200', 'plantao', 'Hospital', true, 2),
        ('ZN 7-13', 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200', 'plantao', 'MapPin', true, 3),
        ('ZN 13-19', 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200', 'plantao', 'MapPin', true, 4),
        ('Noturno 19-7', 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200', 'plantao', 'Moon', true, 5),
        ('Apoio 19-01', 'text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200', 'plantao', 'HandHelping', true, 6),
        ('Corredor Manhã', 'text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200', 'plantao', 'Building', true, 7),
        ('Corredor Tarde', 'text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200', 'plantao', 'Building', true, 8),
        ('Natação', 'text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200', 'treino', 'Waves', true, 9),
        ('Musculação', 'text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 border-green-200', 'treino', 'Dumbbell', true, 10),
        ('Pilates', 'text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200', 'treino', 'Activity', true, 11),
        ('Home Care', 'text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200', 'saude', 'Heart', true, 12),
        ('Lembrete', 'text-gray-700 bg-gray-100 dark:bg-gray-800/30 dark:text-gray-300 border-gray-300', 'pessoal', 'Bell', true, 13),
        ('Outro', 'text-slate-700 bg-slate-50 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200', 'outro', 'Tag', true, 14)
      `);
      
      console.log("✅ 14 categorias padrão inseridas com sucesso!");
    }

    // Verificar resultado final
    const finalCheck = await db.execute(`SELECT id, name, type, sortorder FROM categories ORDER BY sortorder`);
    console.log("\n📋 Categorias no banco:");
    finalCheck.forEach((cat: any) => {
      console.log(`   ${cat.sortorder}. [${cat.type}] ${cat.name} (ID: ${cat.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  }
}

migrateCategories();
