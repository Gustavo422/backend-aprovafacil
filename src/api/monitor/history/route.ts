import { Request, Response } from 'express';
import { metricsStore } from '../../../core/monitoring/metrics-store.js';
import { logger } from '../../../lib/logger.js';

export const GET = async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string || '24');
    
    const history = {
      system: metricsStore.getSystemHistory(hours),
      database: metricsStore.getDatabaseHistory(hours),
      logs: metricsStore.getLogsHistory(hours),
      alerts: metricsStore.getAlerts(),
      stats: metricsStore.getStats(),
    };

    return res.json(history);
  } catch (error) {
    logger.error('Erro ao buscar histórico de monitoramento:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
}; 



