// Script para executar o Vitest com uma porta específica
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para verificar se uma porta está disponível
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Função para encontrar uma porta disponível
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > startPort + 100) {
      throw new Error('Não foi possível encontrar uma porta disponível');
    }
  }
  return port;
}

// Função principal
async function main() {
  try {
    // Encontrar uma porta disponível começando em 51300
    const port = await findAvailablePort(51300);
    console.log(`Iniciando Vitest na porta ${port}...`);

    // Caminho para o executável do Vitest
    const vitestPath = path.join(__dirname, 'node_modules', '.bin', 'vitest');

    // Executar o comando vitest com a porta específica
    const args = process.argv.slice(2);
    const isUi = args.includes('--ui');
    const isCoverage = args.includes('--coverage');

    const vitestArgs = [];
    
    if (isUi) {
      vitestArgs.push('--ui');
      vitestArgs.push('--port', port.toString());
    } else if (isCoverage) {
      vitestArgs.push('run', '--coverage');
    } else {
      vitestArgs.push('run');
    }

    console.log(`Executando: ${vitestPath} ${vitestArgs.join(' ')}`);

    const vitestProcess = spawn(vitestPath, vitestArgs, {
      stdio: 'inherit',
      shell: true,
    });

    vitestProcess.on('error', (error) => {
      console.error(`Erro ao iniciar o Vitest: ${error.message}`);
      process.exit(1);
    });

    vitestProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Vitest encerrou com código de saída ${code}`);
        process.exit(code);
      }
    });

    if (isUi) {
      console.log(`\nVitest UI está rodando em: http://localhost:${port}`);
      console.log('Pressione Ctrl+C para encerrar.');
    }
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

main();