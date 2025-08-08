import type { Request, Response } from 'express';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';

/**
 * GET /api/health - Health check endpoint
 */
export const healthCheckHandler = async (req: Request, res: Response) => {
  try {
    // Verificar conexão com o banco de dados
    const { error } = await supabase
      .from('usuarios')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logger.error('Health check failed - database connection error:', { error: error.message });
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          api: 'up',
        },
        error: 'Database connection failed',
      });
    }

    // Verificar uso de memória
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    logger.debug('Health check successful', { 
      database: 'up', 
      memory: memUsage,
      uptime, 
    });

    return res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        api: 'up',
      },
      system: {
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    });

  } catch (error) {
    logger.error('Health check failed - unexpected error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        api: 'down',
      },
      error: 'Internal server error',
    });
  }
}; 