#!/usr/bin/env node

/**
 * Script para adicionar scripts da FASE 5 ao package.json
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 ADICIONANDO SCRIPTS DA FASE 5 AO PACKAGE.JSON');
console.log('='.repeat(50));

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

try {
  // Ler package.json atual
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);

  // Scripts da FASE 5 para adicionar
  const phase5Scripts = {
    // Testes da FASE 5
    "test:phase5": "node scripts/test-phase5-performance.cjs",
    "test:performance": "node scripts/test-phase5-performance.cjs",
    
    // Monitoramento
    "monitor:performance": "curl -s http://localhost:3001/api/monitor/performance | jq",
    "monitor:stats": "curl -s 'http://localhost:3001/api/monitor/performance?action=stats' | jq",
    "monitor:cache": "curl -s 'http://localhost:3001/api/monitor/performance?action=cache' | jq",
    "monitor:summary": "curl -s 'http://localhost:3001/api/monitor/performance?action=summary' | jq",
    
    // Controle de cache e métricas
    "cache:reset": "curl -X POST http://localhost:3001/api/monitor/performance -H 'Content-Type: application/json' -d '{\"action\":\"reset\"}' | jq",
    "cache:cleanup": "curl -X POST http://localhost:3001/api/monitor/performance -H 'Content-Type: application/json' -d '{\"action\":\"cleanup\"}' | jq",
    
    // Validação completa
    "validate:phase5": "npm run test:phase5 && npm run monitor:summary",
    
    // Deploy com validação da FASE 5
    "deploy:phase5": "npm run validate:phase5 && npm run build && npm run start",
    
    // Limpeza e reset
    "phase5:reset": "npm run cache:reset && npm run cache:cleanup",
    "phase5:cleanup": "npm run cache:cleanup"
  };

  // Adicionar scripts se não existirem
  let addedCount = 0;
  Object.entries(phase5Scripts).forEach(([scriptName, scriptCommand]) => {
    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = scriptCommand;
      logSuccess(`Script adicionado: ${scriptName}`);
      addedCount++;
    } else {
      logInfo(`Script já existe: ${scriptName}`);
    }
  });

  // Salvar package.json atualizado
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

  logSuccess(`✅ ${addedCount} scripts da FASE 5 adicionados ao package.json`);

  // Mostrar resumo dos scripts disponíveis
  console.log('\n📋 SCRIPTS DA FASE 5 DISPONÍVEIS:');
  console.log('='.repeat(40));
  
  Object.keys(phase5Scripts).forEach(scriptName => {
    const description = getScriptDescription(scriptName);
    console.log(`${colors.blue}npm run ${scriptName}${colors.reset} - ${description}`);
  });

  console.log('\n🚀 COMO USAR:');
  console.log('1. Testar implementação: npm run test:phase5');
  console.log('2. Monitorar performance: npm run monitor:performance');
  console.log('3. Ver resumo: npm run monitor:summary');
  console.log('4. Resetar cache: npm run cache:reset');
  console.log('5. Validar tudo: npm run validate:phase5');

} catch (error) {
  logError(`Erro ao adicionar scripts: ${error.message}`);
  process.exit(1);
}

function getScriptDescription(scriptName) {
  const descriptions = {
    'test:phase5': 'Testa toda a implementação da FASE 5',
    'test:performance': 'Testa sistema de performance e cache',
    'monitor:performance': 'Mostra métricas completas de performance',
    'monitor:stats': 'Mostra estatísticas resumidas',
    'monitor:cache': 'Mostra estatísticas do cache',
    'monitor:summary': 'Mostra resumo de saúde do sistema',
    'cache:reset': 'Reseta cache e métricas',
    'cache:cleanup': 'Limpa cache expirado',
    'validate:phase5': 'Valida implementação completa da FASE 5',
    'deploy:phase5': 'Deploy com validação da FASE 5',
    'phase5:reset': 'Reset completo da FASE 5',
    'phase5:cleanup': 'Limpeza da FASE 5'
  };
  
  return descriptions[scriptName] || 'Script da FASE 5';
}

console.log(`\n${ '='.repeat(50)}`);
logSuccess('SCRIPTS DA FASE 5 ADICIONADOS COM SUCESSO!');
console.log('='.repeat(50)); 