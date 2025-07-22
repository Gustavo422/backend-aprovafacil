import { createClient } from '@supabase/supabase-js';
import os from 'os';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    load: number;
    cores: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    error?: string;
  };
  services: {
    supabase: 'connected' | 'disconnected' | 'error';
    api: 'healthy' | 'degraded' | 'unhealthy';
  };
  environment: string;
  version: string;
}

class HealthChecker {
  private supabase: ReturnType<typeof createClient>;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  private getMemoryUsage() {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const percentage = (used.heapUsed / total) * 100;

    return {
      used: Math.round(used.heapUsed / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private getCpuUsage() {
    const loadAvg = os.loadavg();
    const cores = os.cpus().length;

    return {
      load: Math.round(loadAvg[0] * 100) / 100,
      cores
    };
  }

  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected' | 'error'; responseTime?: number; error?: string }> {
    const start = Date.now();
    
    try {
      // Teste simples de conexão com Supabase
      const { error } = await this.supabase
        .from('usuarios')
        .select('count')
        .limit(1)
        .single();

      const responseTime = Date.now() - start;

      if (error) {
        return {
          status: 'error',
          responseTime,
          error: error.message
        };
      }

      return {
        status: 'connected',
        responseTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        status: 'error',
        error: errorMessage
      };
    }
  }

  private getOverallStatus(checks: Partial<HealthStatus>): 'healthy' | 'degraded' | 'unhealthy' {
    const issues = [];

    // Verificar memória
    if (checks.memory && checks.memory.percentage > 90) {
      issues.push('high_memory_usage');
    }

    // Verificar CPU
    if (checks.cpu && checks.cpu.load > checks.cpu.cores * 0.8) {
      issues.push('high_cpu_load');
    }

    // Verificar banco de dados
    if (checks.database && checks.database.status !== 'connected') {
      issues.push('database_issue');
    }

    // Verificar serviços
    if (checks.services) {
      if (checks.services.supabase !== 'connected') issues.push('supabase_issue');
      if (checks.services.api !== 'healthy') issues.push('api_issue');
    }

    if (issues.length === 0) return 'healthy';
    if (issues.length <= 2) return 'degraded';
    return 'unhealthy';
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const database = await this.checkDatabase();
    const uptime = Date.now() - this.startTime;

    const services = {
      supabase: database.status === 'connected' ? 'connected' as const : 'error' as const,
      api: 'healthy' as const
    };

    const status = this.getOverallStatus({
      memory,
      cpu,
      database,
      services
    });

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      memory,
      cpu,
      database,
      services,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  getSimpleStatus(): { status: string; message: string } {
    const memory = this.getMemoryUsage();
    // const uptime = Date.now() - this.startTime; // Removido para evitar warning de variável não usada

    let message = 'API está funcionando!';
    
    if (memory.percentage > 90) {
      message = `⚠️ API funcionando, mas com uso alto de memória (${memory.percentage}%)`;
    }

    return {
      status: 'ok',
      message
    };
  }
}

// Instância será criada quando necessário, após o carregamento das variáveis de ambiente
export function createHealthChecker(): HealthChecker {
  return new HealthChecker();
} 



