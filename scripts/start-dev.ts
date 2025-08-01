#!/usr/bin/env tsx

/**
 * 🚀 SCRIPT DE INICIALIZAÇÃO DO AMBIENTE DE DESENVOLVIMENTO
 * 
 * Executa o pre-flight check e depois inicia backend e frontend simultaneamente.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const FRONTEND_ROOT = join(PROJECT_ROOT, '..', 'frontend');

class DevStarter {
  private processes: any[] = [];

  constructor() {
    // Capturar sinais de interrupção para limpar processos
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private log(message: string, type: 'info' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  private async runPreflightCheck(): Promise<boolean> {
    this.log('Executando pre-flight check...');
    
    try {
      const { PreflightChecker } = await import('./preflight.js');
      const checker = new PreflightChecker();
      await checker.run();
      this.log('Pre-flight check concluído com sucesso!');
      return true;
    } catch (error) {
      this.log(`Pre-flight check falhou: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return false;
    }
  }

  private startBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Iniciando backend...');
      
      const backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        shell: true
      });

      backendProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port')) {
          this.log('Backend iniciado com sucesso!');
          resolve();
        }
        process.stdout.write(`[BACKEND] ${output}`);
      });

      backendProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Error')) {
          this.log(`Erro no backend: ${output}`, 'error');
          reject(new Error(output));
        }
        process.stderr.write(`[BACKEND-ERR] ${output}`);
      });

      backendProcess.on('error', (error) => {
        this.log(`Erro ao iniciar backend: ${error.message}`, 'error');
        reject(error);
      });

      this.processes.push(backendProcess);
    });
  }

  private startFrontend(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Iniciando frontend...');
      
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: FRONTEND_ROOT,
        stdio: 'pipe',
        shell: true
      });

      frontendProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') || output.includes('ready')) {
          this.log('Frontend iniciado com sucesso!');
          resolve();
        }
        process.stdout.write(`[FRONTEND] ${output}`);
      });

      frontendProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Error')) {
          this.log(`Erro no frontend: ${output}`, 'error');
          reject(new Error(output));
        }
        process.stderr.write(`[FRONTEND-ERR] ${output}`);
      });

      frontendProcess.on('error', (error) => {
        this.log(`Erro ao iniciar frontend: ${error.message}`, 'error');
        reject(error);
      });

      this.processes.push(frontendProcess);
    });
  }

  private cleanup(): void {
    this.log('Encerrando processos...');
    
    this.processes.forEach(process => {
      if (!process.killed) {
        process.kill('SIGTERM');
      }
    });
    
    setTimeout(() => {
      this.processes.forEach(process => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      });
      process.exit(0);
    }, 5000);
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Iniciando ambiente de desenvolvimento...\n');
      
      // Executar pre-flight check
      const preflightPassed = await this.runPreflightCheck();
      if (!preflightPassed) {
        this.log('Pre-flight check falhou. Abortando inicialização.', 'error');
        process.exit(1);
      }
      
      console.log('\n🔄 Iniciando serviços...\n');
      
      // Iniciar backend e frontend em paralelo
      await Promise.all([
        this.startBackend(),
        this.startFrontend()
      ]);
      
      console.log('\n🎉 Ambiente de desenvolvimento iniciado com sucesso!');
      console.log('📱 Frontend: http://localhost:3000');
      console.log('🔧 Backend: http://localhost:5000');
      console.log('📚 API Docs: http://localhost:5000/api/docs');
      console.log('\nPressione Ctrl+C para encerrar todos os serviços.\n');
      
    } catch (error) {
      this.log(`Erro ao iniciar ambiente: ${error instanceof Error ? error.message : String(error)}`, 'error');
      this.cleanup();
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const starter = new DevStarter();
  starter.start().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { DevStarter };