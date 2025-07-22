/**
 * Run Integration Tests
 * 
 * This script runs the integration tests with specific configuration.
 * It loads environment variables from .env.test and runs the tests.
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Check if Supabase credentials are available
const hasSupabaseCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

if (!hasSupabaseCredentials) {
  console.warn('\n⚠️  Aviso: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em .env.test');
  console.warn('   Alguns testes de integração podem ser ignorados.\n');
}

// Get command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Testes de Integração do AprovaFácil

Uso:
  node run-integration-tests.js [opções] [arquivos]

Opções:
  --help, -h          Mostra esta ajuda
  --watch, -w         Executa os testes em modo de observação
  --ui, -u            Executa os testes com interface gráfica
  --verbose, -v       Mostra saída detalhada
  --connection        Executa apenas testes de conexão
  --repository        Executa apenas testes de repositório
  --retry             Executa apenas testes de mecanismo de retry
  --transaction       Executa apenas testes de transações
  --cache             Executa apenas testes de cache

Exemplos:
  node run-integration-tests.js                     # Executa todos os testes de integração
  node run-integration-tests.js --watch             # Executa em modo de observação
  node run-integration-tests.js --connection        # Executa apenas testes de conexão
  node run-integration-tests.js tests/integration/supabase-connection-manager.test.ts  # Executa um arquivo específico
  `);
  process.exit(0);
}

// Default command to run all integration tests
let command = ['run', '--config', 'vitest.integration.config.ts'];

// Check for watch mode
if (args.includes('--watch') || args.includes('-w')) {
  command = ['--config', 'vitest.integration.config.ts'];
  args.splice(args.indexOf(args.includes('--watch') ? '--watch' : '-w'), 1);
}

// Check for UI mode
if (args.includes('--ui') || args.includes('-u')) {
  command = ['--ui', '--config', 'vitest.integration.config.ts'];
  args.splice(args.indexOf(args.includes('--ui') ? '--ui' : '-u'), 1);
}

// Check for verbose mode
if (args.includes('--verbose') || args.includes('-v')) {
  command.push('--reporter', 'verbose');
  args.splice(args.indexOf(args.includes('--verbose') ? '--verbose' : '-v'), 1);
}

// Check for specific test categories
const testCategories = {
  '--connection': 'supabase-connection-manager',
  '--repository': 'base-repository|categoria-repository',
  '--retry': 'retry-mechanism',
  '--transaction': 'transaction-handling',
  '--cache': 'cache-mechanism'
};

let testPattern;
for (const [flag, pattern] of Object.entries(testCategories)) {
  if (args.includes(flag)) {
    testPattern = pattern;
    args.splice(args.indexOf(flag), 1);
    break;
  }
}

// Add test pattern if specified
if (testPattern) {
  command.push('--testNamePattern', testPattern);
}

// Add remaining arguments (specific test files)
if (args.length > 0) {
  command = [...command, ...args];
}

console.log('🧪 Executando testes de integração...');
console.log(`📋 Comando: npx vitest ${command.join(' ')}\n`);

// Run the tests
const vitest = spawn('npx', ['vitest', ...command], {
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Testes de integração concluídos com sucesso!');
  } else {
    console.error(`\n❌ Testes de integração falharam com código ${code}`);
    process.exit(code);
  }
});