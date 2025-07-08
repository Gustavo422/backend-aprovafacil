import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { metricsStore, addMetricsToStore } from '../src/core/monitoring/metrics-store.js';
import { getSystemMetrics } from '../src/core/monitoring/system-metrics.js';
import { getDatabaseStatus } from '../src/core/monitoring/database-status.js';
import { getLogStatus } from '../src/core/monitoring/log-status.js';



describe('Sistema de Monitoramento Avançado', () => {
  beforeEach(() => {
    // Limpar o store antes de cada teste
    (metricsStore as any).history = {
      system: [],
      database: [],
      logs: [],
      maxPoints: 288
    };
  });

  afterEach(() => {
    // Limpar o store após cada teste
    (metricsStore as any).history = {
      system: [],
      database: [],
      logs: [],
      maxPoints: 288
    };
  });

  describe('MetricsStore', () => {
    it('deve adicionar métricas do sistema corretamente', () => {
      metricsStore.addSystemMetric(50.5, 75.2);
      
      const history = metricsStore.getSystemHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].cpu).toBe(50.5);
      expect(history[0].memory).toBe(75.2);
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('deve adicionar métricas do banco corretamente', () => {
      metricsStore.addDatabaseMetric(150);
      
      const history = metricsStore.getDatabaseHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].dbResponseTime).toBe(150);
    });

    it('deve adicionar métricas de logs corretamente', () => {
      metricsStore.addLogsMetric(10, 2, 1);
      
      const history = metricsStore.getLogsHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].logInfo).toBe(10);
      expect(history[0].logWarnings).toBe(2);
      expect(history[0].logErrors).toBe(1);
    });

    it('deve limitar o número de pontos no histórico', () => {
      // Adicionar mais pontos que o limite
      for (let i = 0; i < 300; i++) {
        metricsStore.addSystemMetric(i, i);
      }
      
      const history = metricsStore.getSystemHistory(24);
      expect(history).toHaveLength(288); // maxPoints
      expect(history[0].cpu).toBe(12); // Primeiro ponto após o trim
    });

    it('deve gerar alertas para CPU alto', () => {
      // Adicionar métricas com CPU alto
      for (let i = 0; i < 10; i++) {
        metricsStore.addSystemMetric(85, 50);
      }
      
      const alerts = metricsStore.getAlerts();
      const cpuAlerts = alerts.filter(alert => alert.message.includes('CPU alto'));
      expect(cpuAlerts.length).toBeGreaterThan(0);
    });

    it('deve gerar alertas para memória alta', () => {
      // Adicionar métricas com memória alta
      for (let i = 0; i < 10; i++) {
        metricsStore.addSystemMetric(50, 90);
      }
      
      const alerts = metricsStore.getAlerts();
      const memoryAlerts = alerts.filter(alert => alert.message.includes('Memória alta'));
      expect(memoryAlerts.length).toBeGreaterThan(0);
    });

    it('deve gerar alertas para banco lento', () => {
      // Adicionar métricas com banco lento
      for (let i = 0; i < 10; i++) {
        metricsStore.addDatabaseMetric(1500);
      }
      
      const alerts = metricsStore.getAlerts();
      const dbAlerts = alerts.filter(alert => alert.message.includes('Banco lento'));
      expect(dbAlerts.length).toBeGreaterThan(0);
    });

    it('deve gerar alertas para muitos erros nos logs', () => {
      // Adicionar métricas com muitos erros
      for (let i = 0; i < 10; i++) {
        metricsStore.addLogsMetric(5, 1, 2);
      }
      
      const alerts = metricsStore.getAlerts();
      const errorAlerts = alerts.filter(alert => alert.message.includes('erros nos logs'));
      expect(errorAlerts.length).toBeGreaterThan(0);
    });

    it('deve calcular estatísticas corretamente', () => {
      // Adicionar métricas variadas
      metricsStore.addSystemMetric(50, 60);
      metricsStore.addSystemMetric(70, 80);
      metricsStore.addSystemMetric(90, 40);
      
      metricsStore.addDatabaseMetric(100);
      metricsStore.addDatabaseMetric(200);
      metricsStore.addDatabaseMetric(300);
      
      metricsStore.addLogsMetric(5, 1, 0);
      metricsStore.addLogsMetric(3, 2, 1);
      
      const stats = metricsStore.getStats();
      
      expect(stats.system.avgCpu).toBeCloseTo(70, 1);
      expect(stats.system.avgMemory).toBeCloseTo(60, 1);
      expect(stats.system.peakCpu).toBe(90);
      expect(stats.system.peakMemory).toBe(80);
      
      expect(stats.database.avgResponseTime).toBeCloseTo(200, 1);
      expect(stats.database.maxResponseTime).toBe(300);
      expect(stats.database.totalQueries).toBe(3);
      
      expect(stats.logs.totalInfo).toBe(8);
      expect(stats.logs.totalWarnings).toBe(3);
      expect(stats.logs.totalErrors).toBe(1);
    });
  });

  describe('addMetricsToStore', () => {
    it('deve adicionar métricas automaticamente', () => {
      const system = { cpu: { usage: 60 }, memory: { usage: 70 } };
      const database = { responseTime: 150 };
      const logs = { logStats: { info: 5, warnings: 1, errors: 0 } };
      
      addMetricsToStore(system, database, logs);
      
      const systemHistory = metricsStore.getSystemHistory(1);
      const dbHistory = metricsStore.getDatabaseHistory(1);
      const logsHistory = metricsStore.getLogsHistory(1);
      
      expect(systemHistory).toHaveLength(1);
      expect(dbHistory).toHaveLength(1);
      expect(logsHistory).toHaveLength(1);
      
      expect(systemHistory[0].cpu).toBe(60);
      expect(systemHistory[0].memory).toBe(70);
      expect(dbHistory[0].dbResponseTime).toBe(150);
      expect(logsHistory[0].logInfo).toBe(5);
      expect(logsHistory[0].logWarnings).toBe(1);
      expect(logsHistory[0].logErrors).toBe(0);
    });
  });

  describe('Módulos de Monitoramento', () => {
    it('deve obter métricas do sistema', async () => {
      const metrics = await getSystemMetrics();
      
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('platform');
      expect(metrics).toHaveProperty('nodeVersion');
      expect(metrics).toHaveProperty('warnings');
      
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('cores');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('usage');
    });

    it('deve obter status do banco de dados', async () => {
      const status = await getDatabaseStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('responseTime');
      expect(status).toHaveProperty('tables');
      expect(status).toHaveProperty('errors');
      
      expect(status.tables).toHaveProperty('count');
      expect(status.tables).toHaveProperty('list');
    });

    it('deve obter status dos logs', async () => {
      const status = await getLogStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('recentLogs');
      expect(status).toHaveProperty('logStats');
      expect(status).toHaveProperty('logFiles');
      expect(status).toHaveProperty('errors');
      
      expect(status.logStats).toHaveProperty('total');
      expect(status.logStats).toHaveProperty('errors');
      expect(status.logStats).toHaveProperty('warnings');
      expect(status.logStats).toHaveProperty('info');
    });
  });
}); 