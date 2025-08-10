#!/usr/bin/env tsx

/**
 * 🔥 SMOKE TEST DAS ROTAS DA API
 * 
 * Script para testar rotas principais da API de forma real,
 * fazendo requisições HTTP para verificar se estão funcionando.
 */

import { fileURLToPath } from 'url';
import path from 'path';
// Compat: usar fetch global do Node 18+
const _fetch: (input: string, init?: any) => Promise<any> = (globalThis as any).fetch;

interface SmokeTestResult {
  route: string;
  method: string;
  status: 'success' | 'error';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

class SmokeTester {
  private readonly baseUrl: string;
  private backendAccessToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
  }

  private async getTestToken(): Promise<string> {
    if (this.backendAccessToken) return this.backendAccessToken;

    const email = process.env.SMOKE_EMAIL || 'test@aprovafacil.com';
    const password = process.env.SMOKE_PASSWORD || 'Test123!@#';

    // Login no backend para obter nosso JWT
    const resp = await _fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password, rememberMe: false, deviceName: 'smoke-test' }),
    });

    if (!resp.ok) {
      throw new Error(`Falha no login backend (${resp.status}). Defina SMOKE_EMAIL/SMOKE_PASSWORD ou ajuste o usuário de teste.`);
    }

    const body = await resp.json().catch(() => ({}));
    const token = body?.accessToken as string | undefined;
    if (!token) {
      throw new Error('Login backend não retornou accessToken.');
    }
    this.backendAccessToken = token;
    return token;
  }

  private async makeRequest(method: string, path: string, options: any = {}): Promise<SmokeTestResult> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${path}`;
    
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Adicionar token de autenticação se necessário
      if (options.requireAuth) {
        const token = await this.getTestToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await _fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        timeout: 5000 // 5 segundos de timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === options.expectedStatus) {
        return {
          route: path,
          method,
          status: 'success',
          responseTime,
          statusCode: response.status
        };
      } 
        return {
          route: path,
          method,
          status: 'error',
          responseTime,
          statusCode: response.status,
          error: `Status ${response.status} não esperado`
        };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        route: path,
        method,
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runSmokeTest(): Promise<SmokeTestResult[]> {
    console.log('🔥 Iniciando Smoke Test das Rotas...\n');

    const testCases = [
      // Rotas públicas
      { method: 'GET', path: '/api/health', expectedStatus: 200 },
      { method: 'GET', path: '/api/concursos', expectedStatus: 200 },
      
      // Login
      { method: 'POST', path: '/api/auth/login', expectedStatus: 200 },
      
      // Rotas protegidas (devem falhar sem auth)
      { method: 'GET', path: '/api/admin/estatisticas', expectedStatus: 401 },
      { method: 'GET', path: '/api/user/perfil', expectedStatus: 401 },
      
      // Rotas protegidas com auth
      // Perfil depende de colunas opcionais no schema; usar /api/auth/me para smoke autenticado
      { method: 'GET', path: '/api/auth/me', expectedStatus: 200, requireAuth: true },
      // { method: 'GET', path: '/api/user/estatisticas', expectedStatus: 200, requireAuth: true }, // opcional

      // Guru da Aprovação (aliases estáveis)
      { method: 'GET', path: '/api/guru/v1/dashboard/enhanced-stats', expectedStatus: 200, requireAuth: true },
      { method: 'GET', path: '/api/guru/v1/dashboard/activities', expectedStatus: 200, requireAuth: true },
    ];

    const results: SmokeTestResult[] = [];

    for (const testCase of testCases) {
      console.log(`Testando ${testCase.method} ${testCase.path}...`);
      
      const result = await this.makeRequest(
        testCase.method, 
        testCase.path, 
        {
          expectedStatus: testCase.expectedStatus,
          requireAuth: testCase.requireAuth
        }
      );
      
      results.push(result);
      
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.method} ${result.route}: ${result.statusCode || 'N/A'} (${result.responseTime}ms)`);
      
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
    }

    return results;
  }

  generateReport(results: SmokeTestResult[]): void {
    console.log('\n📊 RELATÓRIO DO SMOKE TEST');
    console.log('==========================');
    
    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const error = results.filter(r => r.status === 'error').length;
    
    console.log(`Total de rotas testadas: ${total}`);
    console.log(`✅ Sucessos: ${success}`);
    console.log(`❌ Erros: ${error}`);
    
    const times = results.map(r => r.responseTime).sort((a, b) => a - b);
    const avgResponseTime = times.reduce((sum, t) => sum + t, 0) / total;
    const p95Index = Math.max(0, Math.ceil(0.95 * times.length) - 1);
    const p95 = times[p95Index] ?? 0;
    console.log(`⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`⏱️  p95 de resposta: ${p95.toFixed(0)}ms`);
    
    if (error > 0) {
      console.log('\n🚨 ROTAS COM ERRO:');
      results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  • ${r.method} ${r.route}: ${r.error}`);
        });
    }
    
    const slowRoutes = results.filter(r => r.responseTime > 1000);
    if (slowRoutes.length > 0) {
      console.log('\n🐌 ROTAS LENTAS (>1s):');
      slowRoutes.forEach(r => {
        console.log(`  • ${r.method} ${r.route}: ${r.responseTime}ms`);
      });
    }
  }
}

async function main(): Promise<void> {
  try {
    const tester = new SmokeTester();
    const results = await tester.runSmokeTest();
    tester.generateReport(results);

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      console.log('\n❌ Smoke test FALHOU');
      process.exit(1);
    } else {
      console.log('\n✅ Smoke test PASSOU');
    }
  } catch (error) {
    console.error('❌ Erro fatal no smoke test:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Executar se chamado diretamente (compat Windows/Unix)
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const called = path.resolve(process.argv[1] || '');
    return thisFile === called;
  } catch {
    return false;
  }
})();

if (isMain) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

export { SmokeTester };