// Teste direto da função getDb()
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar a função getDb
const { getDb } = await import(join(__dirname, 'server/db.ts'));

console.log('🔍 Testando getDb() diretamente...');

try {
  console.log('Chamando getDb()...');
  const db = await getDb();
  
  if (!db) {
    console.error('❌ getDb() retornou null!');
    process.exit(1);
  }
  
  console.log('✅ getDb() retornou uma instância');
  console.log('Tipo:', typeof db);
  console.log('Constructor:', db.constructor.name);
  
  // Tentar fazer uma query
  console.log('\nTentando fazer uma query...');
  const result = await db.select().from(/* events table */);
  console.log('Query result:', result);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
