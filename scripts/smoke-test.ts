#!/usr/bin/env tsx

/**
 * 🔥 SMOKE TEST DAS ROTAS DA API
 * 
 * Script para testar rotas principais da API de forma real,
 * fazendo requisições HTTP para verificar se estão funcionando.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

interface SmokeTestResult {
  route: string;
  method: string;
  status: 'success' | 'error';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

class SmokeTester {
  private baseUrl: string;
  private supabase: any;
  private testToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    
    // Inicializar Supabase para obter token de teste
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async getTestToken(): Promise<string> {
    if (this.testToken) return this.testToken;

    try {
      // Fazer login com usuário de teste
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: 'test@aprovafacil.com',
        password: 'Test123!@#'
      });

      if (error) throw error;
      
      this.testToken = data.session.access_token;
      return this.testToken;
    } catch (error) {
      throw new Error(`Erro ao obter token de teste: ${error instanceof Error ? error.message : String(error)}`);
    }
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

      const response = await fetch(url, {
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
      } else {
        return {
          route: path,
          method,
          status: 'error',
          responseTime,
          statusCode: response.status,
          error: `Status ${response.status} não esperado`
        };
      }
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
      { method: 'GET', path: '/api/categorias', expectedStatus: 200 },
      
      // Rotas que esperam erro (sem body)
      { method: 'POST', path: '/api/auth/login', expectedStatus: 400 },
      
      // Rotas protegidas (devem falhar sem auth)
      { method: 'GET', path: '/api/admin/estatisticas', expectedStatus: 401 },
      { method: 'GET', path: '/api/user/perfil', expectedStatus: 401 },
      
      // Rotas protegidas com auth
      { method: 'GET', path: '/api/user/perfil', expectedStatus: 200, requireAuth: true },
      { method: 'GET', path: '/api/user/estatisticas', expectedStatus: 200, requireAuth: true },
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
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;
    console.log(`⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
    
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

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SmokeTester();
  tester.runSmokeTest()
    .then(results => {
      tester.generateReport(results);
      
      const hasErrors = results.some(r => r.status === 'error');
      if (hasErrors) {
        console.log('\n❌ Smoke test FALHOU');
        process.exit(1);
      } else {
        console.log('\n✅ Smoke test PASSOU');
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal no smoke test:', error);
      process.exit(1);
    });
}

export { SmokeTester };