import { Request, Response } from 'express';
import { z } from 'zod';
import { performanceMetrics } from '../../../core/monitoring/performance-metrics.service.js';
import { userCache } from '../../../core/cache/user-cache.service.js';
import { logger } from '../../../lib/logger.js';

const querySchema = z.object({
  action: z.enum(['stats', 'cache', 'reset', 'summary']).optional(),
});

const bodySchema = z.object({
  action: z.enum(['reset', 'cleanup']),
});

/**
 * GET /api/monitor/performance - Retorna métricas de performance do sistema
 */
export const getPerformanceHandler = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.format(),
      });
    }

    const { action } = validationResult.data;

    switch (action) {
    case 'stats':
      return getPerformanceStats(res);
    case 'cache':
      return getCacheStats(res);
    case 'reset':
      return resetMetrics(res);
    case 'summary':
      return getSummary(res);
    default:
      return getFullMetrics(res);
    }
  } catch (error) {
    logger.error('Erro ao obter métricas de performance', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({ 
      success: false,
      error: 'Erro interno ao obter métricas', 
    });
  }
};

/**
 * POST /api/monitor/performance - Ações de controle do monitoramento
 */
export const postPerformanceHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = bodySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const { action } = validationResult.data;

    switch (action) {
    case 'reset':
      performanceMetrics.resetMetrics();
      userCache.clearCache();
      logger.info('Métricas e cache resetados via API');
      return res.json({ 
        success: true,
        message: 'Métricas e cache resetados com sucesso', 
      });

    case 'cleanup':
      userCache.cleanup();
      logger.info('Cache limpo via API');
      return res.json({ 
        success: true,
        message: 'Cache limpo com sucesso', 
      });

    default:
      return res.status(400).json({
        success: false,
        error: 'Ação não reconhecida',
      });
    }
  } catch (error) {
    logger.error('Erro ao executar ação de monitoramento', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao executar ação',
    });
  }
};

/**
 * Obtém estatísticas completas de performance
 */
function getFullMetrics(res: Response) {
  const stats = performanceMetrics.getStats();
  const cacheStats = userCache.getStats();

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    performance: {
      auth: {
        total: stats.auth.total,
        average: `${stats.auth.average.toFixed(2)}ms`,
        errors: stats.auth.errors,
        errorRate: `${(stats.auth.errorRate * 100).toFixed(2)}%`,
      },
      database: {
        queries: stats.database.queries,
        average: `${stats.database.average.toFixed(2)}ms`,
        errors: stats.database.errors,
        errorRate: `${(stats.database.errorRate * 100).toFixed(2)}%`,
      },
      api: {
        requests: stats.api.requests,
        average: `${stats.api.average.toFixed(2)}ms`,
        errors: stats.api.errors,
        errorRate: `${(stats.api.errorRate * 100).toFixed(2)}%`,
      },
    },
    cache: {
      hits: Math.round((cacheStats.hitRate as number) * 100), // Usar hitRate como porcentagem
      misses: Math.round((cacheStats.missRate as number) * 100), // Usar missRate como porcentagem
      hitRate: `${((cacheStats.hitRate as number) * 100).toFixed(2)}%`,
      size: cacheStats.size as number,
      maxSize: cacheStats.maxSize as number,
      utilization: `${(((cacheStats.size as number) / (cacheStats.maxSize as number)) * 100).toFixed(2)}%`,
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    },
  });
}

/**
 * Obtém estatísticas de performance resumidas
 */
function getPerformanceStats(res: Response) {
  const stats = performanceMetrics.getStats();

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    auth: {
      total: stats.auth.total,
      average: `${stats.auth.average.toFixed(2)}ms`,
      errorRate: `${(stats.auth.errorRate * 100).toFixed(2)}%`,
    },
    database: {
      queries: stats.database.queries,
      average: `${stats.database.average.toFixed(2)}ms`,
      errorRate: `${(stats.database.errorRate * 100).toFixed(2)}%`,
    },
    api: {
      requests: stats.api.requests,
      average: `${stats.api.average.toFixed(2)}ms`,
      errorRate: `${(stats.api.errorRate * 100).toFixed(2)}%`,
    },
  });
}

/**
 * Obtém estatísticas do cache
 */
function getCacheStats(res: Response) {
  const stats = userCache.getStats();

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    cache: {
      hits: Math.round((stats.hitRate as number) * 100), // Usar hitRate como porcentagem
      misses: Math.round((stats.missRate as number) * 100), // Usar missRate como porcentagem
      hitRate: `${((stats.hitRate as number) * 100).toFixed(2)}%`,
      size: stats.size as number,
      maxSize: stats.maxSize as number,
      utilization: `${(((stats.size as number) / (stats.maxSize as number)) * 100).toFixed(2)}%`,
    },
  });
}

/**
 * Reseta todas as métricas
 */
function resetMetrics(res: Response) {
  performanceMetrics.resetMetrics();
  userCache.clearCache();

  return res.json({
    success: true,
    message: 'Métricas resetadas com sucesso',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Obtém resumo das métricas
 */
function getSummary(res: Response) {
  const stats = performanceMetrics.getStats();
  const cacheStats = userCache.getStats();

  // Calcular status de saúde do sistema
  const authHealth = stats.auth.errorRate < 0.05 ? 'healthy' : 'warning';
  const dbHealth = stats.database.errorRate < 0.01 ? 'healthy' : 'warning';
  const apiHealth = stats.api.errorRate < 0.02 ? 'healthy' : 'warning';
  const cacheHealth = (cacheStats.hitRate as number) > 0.7 ? 'healthy' : 'warning';

  const overallHealth = [authHealth, dbHealth, apiHealth, cacheHealth].every(h => h === 'healthy') 
    ? 'healthy' 
    : 'warning';

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    health: {
      overall: overallHealth,
      auth: authHealth,
      database: dbHealth,
      api: apiHealth,
      cache: cacheHealth,
    },
    summary: {
      totalRequests: stats.api.requests,
      averageResponseTime: `${stats.api.average.toFixed(2)}ms`,
      cacheHitRate: `${((cacheStats.hitRate as number) * 100).toFixed(2)}%`,
      errorRate: `${(stats.api.errorRate * 100).toFixed(2)}%`,
    },
  });
}