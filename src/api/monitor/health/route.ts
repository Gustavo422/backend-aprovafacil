import { Request, Response } from 'express';
import { HealthService } from '../../../services/health.service.js';

const healthService = new HealthService();

/**
 * GET /api/monitor/health - Health check endpoint
 */
export const getHealthHandler = async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthService.getHealthStatus();
    if (healthStatus.status === 'unhealthy') {
      return res.status(503).json(healthStatus);
    }
    return res.status(200).json(healthStatus);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao verificar a saúde do sistema';
    return res.status(500).json({ 
      status: 'unhealthy', 
      error: 'Internal Server Error',
      details: errorMessage,
      timestamp: new Date().toISOString(), 
    });
  }
}; 