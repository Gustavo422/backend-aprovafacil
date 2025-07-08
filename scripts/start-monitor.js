#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Central de Monitoramento AprovaFácil...\n');

// Verificar se estamos no diretório correto
const packageJsonPath = path.join(process.cwd(), 'package.json');
try {
  require(packageJsonPath);
} catch (error) {
  console.error('❌ Erro: Execute este script no diretório backend/');
  process.exit(1);
}

// Função para executar comando
function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} concluído`);
        resolve();
      } else {
        console.error(`❌ ${description} falhou com código ${code}`);
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Erro ao executar ${description}:`, error.message);
      reject(error);
    });
  });
}

async function startMonitor() {
  try {
    // Verificar se o build está atualizado
    console.log('🔍 Verificando build...');
    await runCommand('npm', ['run', 'build'], 'Build do projeto');
    
    // Iniciar servidor de desenvolvimento
    console.log('🌐 Iniciando servidor de monitoramento...');
    console.log('📍 Dashboard disponível em: http://localhost:3000/api/monitor/dashboard');
    console.log('📊 API de monitoramento: http://localhost:3000/api/monitor');
    console.log('📚 Documentação: http://localhost:3000/api/docs');
    console.log('\n⏹️  Pressione Ctrl+C para parar o servidor\n');
    
    // Iniciar servidor
    const server = spawn('npm', ['start'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    server.on('close', (code) => {
      console.log(`\n🛑 Servidor parado com código ${code}`);
      process.exit(code);
    });

    server.on('error', (error) => {
      console.error('❌ Erro no servidor:', error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar monitoramento:', error.message);
    process.exit(1);
  }
}

// Tratamento de sinais para parada graciosa
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido sinal de parada...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido sinal de término...');
  process.exit(0);
});

// Iniciar
startMonitor(); 