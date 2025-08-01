import { Request, Response } from 'express';
import { getSystemMetrics } from '../../core/monitoring/system-metrics.js';
import { getDatabaseStatus } from '../../core/monitoring/database-status.js';
import { getTestStatus } from '../../core/monitoring/test-status.js';
import { getLogStatus } from '../../core/monitoring/log-status.js';
import { metricsStore, addMetricsToStore } from '../../core/monitoring/metrics-store.js';
import { logger } from '../../lib/logger.js';

export const GET = async (req: Request, res: Response) => {
  try {
    // Coletar métricas em paralelo para performance
    const [systemMetrics, dbStatus, testStatus, logStatus] = await Promise.all([
      getSystemMetrics(),
      getDatabaseStatus(),
      getTestStatus(),
      getLogStatus(),
    ]);

    // Adicionar métricas ao store para histórico
    addMetricsToStore(systemMetrics, dbStatus, logStatus);

    // Obter histórico e alertas
    const systemHistory = metricsStore.getSystemHistory(24);
    const databaseHistory = metricsStore.getDatabaseHistory(24);
    const logsHistory = metricsStore.getLogsHistory(24);
    const alerts = metricsStore.getAlerts();
    const stats = metricsStore.getStats();

    const dashboardData = {
      timestamp: new Date().toISOString(),
      system: {
        ...systemMetrics,
        history: systemHistory,
        stats: stats.system,
      },
      database: {
        ...dbStatus,
        history: databaseHistory,
        stats: stats.database,
      },
      tests: testStatus,
      logs: {
        ...logStatus,
        history: logsHistory,
        stats: stats.logs,
      },
      alerts,
      overall: {
        status: getOverallStatus(systemMetrics, dbStatus, testStatus, logStatus, alerts),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    return res.json(dashboardData);
  } catch (error) {
    logger.error('Erro ao gerar dashboard de monitoramento:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
      status: 'error',
    });
  }
};

function getOverallStatus(
  system: { status: string }, 
  db: { status: string }, 
  tests: { status: string }, 
  logs: { status: string },
  alerts: Array<{type: 'warning' | 'error', message: string, timestamp: number}>,
): string {
  const statuses = [system.status, db.status, tests.status, logs.status];
  
  // Se há erros nos alertas, status é error
  if (alerts.some(alert => alert.type === 'error')) return 'error';
  
  // Se há erros nos componentes, status é error
  if (statuses.includes('error')) return 'error';
  
  // Se há warnings nos alertas ou componentes, status é warning
  if (alerts.some(alert => alert.type === 'warning') || statuses.includes('warning')) return 'warning';
  
  return 'healthy';
} 



