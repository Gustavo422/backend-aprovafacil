// Script para executar o Vitest com cobertura de testes com privilégios elevados
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Iniciando Vitest com cobertura de testes...');

// Caminho para o executável do Vitest
const vitestPath = path.join(__dirname, 'node_modules', '.bin', 'vitest');

// Executar o comando vitest run --coverage
const vitestProcess = spawn(vitestPath, ['run', '--coverage'], {
  stdio: 'inherit',
  shell: true,
});

vitestProcess.on('error', (error) => {
  console.error(`Erro ao iniciar o Vitest com cobertura: ${error.message}`);
  process.exit(1);
});

vitestProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Vitest com cobertura encerrou com código de saída ${code}`);
    process.exit(code);
  }
});