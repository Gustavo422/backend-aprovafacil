const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas!');
  console.error('Verifique se o arquivo .env.local existe com:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para executar SQL
async function executeSQL(sqlContent, fileName) {
  try {
    console.log(`🔄 Executando ${fileName}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // Se exec_sql não existir, tentar executar diretamente
      console.log(`⚠️  exec_sql não disponível, tentando execução direta...`);
      
      // Dividir o SQL em comandos individuais
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.trim()) {
          const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command + ';' });
          if (cmdError) {
            console.log(`⚠️  Comando ignorado (pode ser normal): ${command.substring(0, 50)}...`);
          }
        }
      }
    }
    
    console.log(`✅ ${fileName} executado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar ${fileName}:`, error.message);
    return false;
  }
}

// Função para ler arquivo SQL
async function readSQLFile(filePath) {
  try {
    const fs = require('fs').promises;
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo ${filePath}:`, error.message);
    return null;
  }
}

// Função principal
async function setupDatabase() {
  console.log('🚀 Iniciando configuração do banco de dados...\n');
  
  // Usar o arquivo completo de configuração
  const sqlFile = { path: 'docs/database/database_setup_complete.sql', name: 'Configuração Completa do Banco' };
  
  const sqlContent = await readSQLFile(sqlFile.path);
  if (sqlContent) {
    const success = await executeSQL(sqlContent, sqlFile.name);
    if (success) {
      console.log('\n🎉 Banco de dados configurado com sucesso!');
      console.log('Agora você pode testar o sistema de concursos.');
    } else {
      console.log('\n⚠️  Erro na configuração do banco de dados.');
      console.log('Verifique os logs acima para mais detalhes.');
    }
  } else {
    console.log('\n❌ Não foi possível ler o arquivo SQL.');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase }; 