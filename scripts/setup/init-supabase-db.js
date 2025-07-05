import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração do diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do cliente Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para executar um arquivo SQL
async function executeSqlFile(filePath) {
  try {
    console.log(`Executando arquivo SQL: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Dividir o SQL em instruções individuais
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`[${index + 1}/${statements.length}] Executando: ${statement.substring(0, 100)}...`);
        
        try {
          // Usar RPC para executar SQL direto
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          
          if (error) {
            console.error(`Erro ao executar a declaração ${index + 1}:`, error.message);
            // Continuar mesmo com erros, pois alguns comandos podem falhar (ex: DROP TABLE se não existir)
          }
        } catch (err) {
          console.error(`Erro inesperado ao executar a declaração ${index + 1}:`, err.message);
        }
      }
    }
    
    console.log(`Arquivo ${path.basename(filePath)} executado com sucesso!`);
    return true;
  } catch (err) {
    console.error(`Erro ao executar o arquivo SQL ${filePath}:`, err);
    return false;
  }
}

// Função principal
async function initializeDatabase() {
  console.log('Iniciando inicialização do banco de dados...');
  
  try {
    // 1. Executar esquema do banco de dados
    const schemaPath = path.join(__dirname, '../docs/database/database_schema.sql');
    await executeSqlFile(schemaPath);
    
    // 2. Executar dados iniciais (se houver)
    const seedPath = path.join(__dirname, '../docs/database/seed_data.sql');
    if (fs.existsSync(seedPath)) {
      await executeSqlFile(seedPath);
    } else {
      console.log('Arquivo de dados iniciais não encontrado. Continuando sem dados iniciais.');
    }
    
    // 3. Executar migrações adicionais (se houver)
    const migrationPath = path.join(__dirname, '../docs/database/add_users_columns.sql');
    if (fs.existsSync(migrationPath)) {
      await executeSqlFile(migrationPath);
    }
    
    console.log('✅ Inicialização do banco de dados concluída com sucesso!');
    console.log('Você pode acessar o Supabase Studio em: http://127.0.0.1:54323');
  } catch (err) {
    console.error('❌ Erro durante a inicialização do banco de dados:', err);
    process.exit(1);
  }
}

// Executar a inicialização
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase();
}

export { initializeDatabase };
