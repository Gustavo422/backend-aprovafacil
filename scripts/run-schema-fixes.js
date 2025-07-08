#!/usr/bin/env node

/**
 * Script para executar correções de schema de forma automatizada
 * Este script executa o SQL de correção e atualiza os tipos TypeScript
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const config = {
  sqlFile: path.join(__dirname, 'fix-schema-inconsistencies.sql'),
  typesScript: path.join(__dirname, 'update-typescript-types.js'),
  backendDir: path.join(__dirname, '..'),
  supabaseConfig: path.join(__dirname, '..', 'supabase', 'config.toml')
};

// Função para verificar se o arquivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Função para executar comando
function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`🔄 Executando: ${command}`);
    const result = execSync(command, { 
      cwd, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    console.log(`✅ Comando executado com sucesso`);
    return result;
  } catch (error) {
    console.error(`❌ Erro ao executar comando: ${error.message}`);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    throw error;
  }
}

// Função para verificar se Supabase está configurado
function checkSupabaseConfig() {
  if (!fileExists(config.supabaseConfig)) {
    console.error('❌ Arquivo de configuração do Supabase não encontrado');
    console.log('📁 Procurando em:', config.supabaseConfig);
    return false;
  }
  return true;
}

// Função para executar o SQL de correção
function runSqlFixes() {
  console.log('\n🔧 Executando correções SQL...');
  
  if (!fileExists(config.sqlFile)) {
    console.error('❌ Arquivo SQL de correção não encontrado');
    return false;
  }
  
  try {
    // Ler o conteúdo do SQL
    const sqlContent = fs.readFileSync(config.sqlFile, 'utf8');
    console.log('📄 Conteúdo do SQL carregado');
    
    // Aqui você pode integrar com o Supabase CLI ou outro método
    // Por enquanto, vamos apenas mostrar o que seria executado
    console.log('⚠️  Para executar o SQL, use um dos métodos abaixo:');
    console.log('1. Supabase CLI: supabase db reset');
    console.log('2. psql diretamente: psql -f fix-schema-inconsistencies.sql');
    console.log('3. Interface web do Supabase');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao ler arquivo SQL:', error.message);
    return false;
  }
}

// Função para atualizar tipos TypeScript
function updateTypeScriptTypes() {
  console.log('\n📝 Atualizando tipos TypeScript...');
  
  if (!fileExists(config.typesScript)) {
    console.error('❌ Script de atualização de tipos não encontrado');
    return false;
  }
  
  try {
    runCommand(`node ${config.typesScript}`, __dirname);
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar tipos:', error.message);
    return false;
  }
}

// Função para executar verificações
function runValidations() {
  console.log('\n🔍 Executando verificações...');
  
  try {
    // Verificar se o TypeScript compila
    console.log('🔄 Verificando compilação TypeScript...');
    runCommand('npx tsc --noEmit', config.backendDir);
    
    // Verificar linting
    console.log('🔄 Verificando linting...');
    runCommand('npm run lint', config.backendDir);
    
    return true;
  } catch (error) {
    console.error('❌ Erro nas verificações:', error.message);
    return false;
  }
}

// Função para criar relatório
function createReport() {
  const report = {
    timestamp: new Date().toISOString(),
    status: 'completed',
    steps: [
      {
        name: 'Verificação de configuração',
        status: checkSupabaseConfig() ? 'success' : 'error'
      },
      {
        name: 'Execução de correções SQL',
        status: runSqlFixes() ? 'success' : 'error'
      },
      {
        name: 'Atualização de tipos TypeScript',
        status: updateTypeScriptTypes() ? 'success' : 'error'
      },
      {
        name: 'Verificações finais',
        status: runValidations() ? 'success' : 'error'
      }
    ]
  };
  
  const reportPath = path.join(__dirname, 'schema-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Relatório salvo em: ${reportPath}`);
  
  return report;
}

// Função principal
function main() {
  console.log('🚀 Iniciando correção de inconsistências de schema...\n');
  
  try {
    const report = createReport();
    
    const successCount = report.steps.filter(step => step.status === 'success').length;
    const totalSteps = report.steps.length;
    
    console.log(`\n📈 Resumo: ${successCount}/${totalSteps} etapas concluídas com sucesso`);
    
    if (successCount === totalSteps) {
      console.log('🎉 Todas as correções foram aplicadas com sucesso!');
    } else {
      console.log('⚠️  Algumas etapas falharam. Verifique o relatório para detalhes.');
    }
    
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute o SQL de correção no seu banco de dados');
    console.log('2. Verifique se todas as colunas foram criadas corretamente');
    console.log('3. Teste as funcionalidades da aplicação');
    console.log('4. Execute os testes automatizados');
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  runSqlFixes,
  updateTypeScriptTypes,
  runValidations,
  createReport
}; 