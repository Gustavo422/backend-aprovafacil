#!/usr/bin/env tsx

import { exec } from 'child_process';
import { DebugLogger } from '../src/core/utils/debug-logger.js';

console.log('🚀 Iniciando AprovaFácil Backend em modo DEBUG...\n');

// Habilitar modo debug
const debugLogger = DebugLogger.getInstance();
debugLogger.enableDebugMode();

// Configurar variáveis de ambiente para debug
Object.assign(process.env, {
  NODE_ENV: 'development',
  DEBUG: 'true'
});

console.log('📊 Sistema de Debug Ativado:');
console.log('  • Logs do Supabase: app:supabase');
console.log('  • Logs do Backend: app:backend');
console.log('  • Todos os logs: app:*\n');

// Função para executar comando
function runCommand(command: string, args: string[], cwd: string, name: string) {
  console.log(`🔄 Iniciando ${name}...`);
  console.log(`Comando: ${command} ${args.join(' ')}`);
  console.log(`Diretório: ${cwd}\n`);
  
  const fullCommand = `${command} ${args.join(' ')}`;
  
  const child = exec(fullCommand, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DEBUG: 'true'
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erro ao executar ${name}:`, error.message);
      process.exit(1);
    }
  });

  if (child.stdout) {
    child.stdout.pipe(process.stdout);
  }
  if (child.stderr) {
    child.stderr.pipe(process.stderr);
  }

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} encerrou com código ${code}`);
      process.exit(code || 1);
    }
  });

  return child;
}

// Iniciar backend
const backendProcess = runCommand('npm', ['run', 'dev'], '.', 'Backend');

// Gerenciar encerramento somente do backend
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando backend...');
  backendProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando backend...');
  backendProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('\n📋 Comandos úteis:');
console.log('  • Ctrl+C: Encerrar aplicação');
console.log('  • Backend: http://localhost:5000');
console.log('  • Health Check: http://localhost:5000/api/health');
console.log('  • Admin Panel: http://localhost:5000/api/admin/estatisticas\n');

console.log('🔍 Logs de Debug serão exibidos abaixo:\n'); 