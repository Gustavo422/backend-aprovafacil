interface MetricPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  dbResponseTime: number;
  logErrors: number;
  logWarnings: number;
  logInfo: number;
}

interface MetricsHistory {
  system: MetricPoint[];
  database: MetricPoint[];
  logs: MetricPoint[];
  maxPoints: number;
}

class MetricsStore {
  private history: MetricsHistory;
  private maxPoints: number;

  constructor(maxPoints: number = 288) { // 24 horas com pontos a cada 5 minutos
    this.maxPoints = maxPoints;
    this.history = {
      system: [],
      database: [],
      logs: [],
      maxPoints,
    };
  }

  addSystemMetric(cpu: number, memory: number): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      cpu,
      memory,
      dbResponseTime: 0,
      logErrors: 0,
      logWarnings: 0,
      logInfo: 0,
    };

    this.history.system.push(point);
    this.trimHistory(this.history.system);
  }

  addDatabaseMetric(responseTime: number): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      cpu: 0,
      memory: 0,
      dbResponseTime: responseTime,
      logErrors: 0,
      logWarnings: 0,
      logInfo: 0,
    };

    this.history.database.push(point);
    this.trimHistory(this.history.database);
  }

  addLogsMetric(info: number, warnings: number, errors: number): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      cpu: 0,
      memory: 0,
      dbResponseTime: 0,
      logErrors: errors,
      logWarnings: warnings,
      logInfo: info,
    };

    this.history.logs.push(point);
    this.trimHistory(this.history.logs);
  }

  private trimHistory(array: MetricPoint[]): void {
    if (array.length > this.maxPoints) {
      array.splice(0, array.length - this.maxPoints);
    }
  }

  getSystemHistory(hours: number = 24): MetricPoint[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.history.system.filter(point => point.timestamp >= cutoff);
  }

  getDatabaseHistory(hours: number = 24): MetricPoint[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.history.database.filter(point => point.timestamp >= cutoff);
  }

  getLogsHistory(hours: number = 24): MetricPoint[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.history.logs.filter(point => point.timestamp >= cutoff);
  }

  getAlerts(): Array<{type: 'warning' | 'error', message: string, timestamp: number}> {
    const alerts: Array<{type: 'warning' | 'error', message: string, timestamp: number}> = [];
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Verificar métricas do sistema
    const recentSystem = this.history.system.filter(p => p.timestamp >= oneHourAgo);
    if (recentSystem.length > 0) {
      const avgCpu = recentSystem.reduce((sum, p) => sum + p.cpu, 0) / recentSystem.length;
      const avgMemory = recentSystem.reduce((sum, p) => sum + p.memory, 0) / recentSystem.length;

      if (avgCpu > 80) {
        alerts.push({
          type: 'warning',
          message: `CPU alto: ${avgCpu.toFixed(1)}% (média da última hora)`,
          timestamp: now,
        });
      }

      if (avgMemory > 85) {
        alerts.push({
          type: 'warning',
          message: `Memória alta: ${avgMemory.toFixed(1)}% (média da última hora)`,
          timestamp: now,
        });
      }
    }

    // Verificar banco de dados
    const recentDb = this.history.database.filter(p => p.timestamp >= oneHourAgo);
    if (recentDb.length > 0) {
      const avgResponseTime = recentDb.reduce((sum, p) => sum + p.dbResponseTime, 0) / recentDb.length;
      if (avgResponseTime > 1000) {
        alerts.push({
          type: 'warning',
          message: `Banco lento: ${avgResponseTime.toFixed(0)}ms (média da última hora)`,
          timestamp: now,
        });
      }
    }

    // Verificar logs
    const recentLogs = this.history.logs.filter(p => p.timestamp >= oneHourAgo);
    if (recentLogs.length > 0) {
      const totalErrors = recentLogs.reduce((sum, p) => sum + p.logErrors, 0);
      if (totalErrors > 10) {
        alerts.push({
          type: 'error',
          message: `${totalErrors} erros nos logs na última hora`,
          timestamp: now,
        });
      }
    }

    return alerts;
  }

  getStats(): {
    system: { avgCpu: number; avgMemory: number; peakCpu: number; peakMemory: number };
    database: { avgResponseTime: number; maxResponseTime: number; totalQueries: number };
    logs: { totalErrors: number; totalWarnings: number; totalInfo: number };
    } {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const recentSystem = this.history.system.filter(p => p.timestamp >= oneHourAgo);
    const recentDb = this.history.database.filter(p => p.timestamp >= oneHourAgo);
    const recentLogs = this.history.logs.filter(p => p.timestamp >= oneHourAgo);

    return {
      system: {
        avgCpu: recentSystem.length > 0 ? recentSystem.reduce((sum, p) => sum + p.cpu, 0) / recentSystem.length : 0,
        avgMemory: recentSystem.length > 0 ? recentSystem.reduce((sum, p) => sum + p.memory, 0) / recentSystem.length : 0,
        peakCpu: recentSystem.length > 0 ? Math.max(...recentSystem.map(p => p.cpu)) : 0,
        peakMemory: recentSystem.length > 0 ? Math.max(...recentSystem.map(p => p.memory)) : 0,
      },
      database: {
        avgResponseTime: recentDb.length > 0 ? recentDb.reduce((sum, p) => sum + p.dbResponseTime, 0) / recentDb.length : 0,
        maxResponseTime: recentDb.length > 0 ? Math.max(...recentDb.map(p => p.dbResponseTime)) : 0,
        totalQueries: recentDb.length,
      },
      logs: {
        totalErrors: recentLogs.reduce((sum, p) => sum + p.logErrors, 0),
        totalWarnings: recentLogs.reduce((sum, p) => sum + p.logWarnings, 0),
        totalInfo: recentLogs.reduce((sum, p) => sum + p.logInfo, 0),
      },
    };
  }
}

// Instância global do store
export const metricsStore = new MetricsStore();

// Função para adicionar métricas automaticamente
export function addMetricsToStore(
  system: { cpu: { usage: number }; memory: { usage: number } },
  database: { responseTime?: number },
  logs: { logStats?: { info?: number; warnings?: number; errors?: number } },
): void {
  metricsStore.addSystemMetric(system.cpu.usage, system.memory.usage);
  metricsStore.addDatabaseMetric(database.responseTime || 0);
  metricsStore.addLogsMetric(
    logs.logStats?.info || 0,
    logs.logStats?.warnings || 0,
    logs.logStats?.errors || 0,
  );
} 



