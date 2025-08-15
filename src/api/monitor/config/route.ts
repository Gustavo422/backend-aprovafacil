import express, { type Request, type Response } from 'express';
import { getConfig as getQuestoesSemanaisConfig } from '../../../modules/questoes-semanais/questoes-semanais.config.js';
import cacheConfig from '../../../config/cache.config.js';

/**
 * GET /api/monitor/config - Endpoint de monitoramento de configurações
 */
export const getConfigHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const start = Date.now();
    
    // Obter configurações de questões semanais
    const qsConfig = getQuestoesSemanaisConfig();
    const cache = cacheConfig;
    
    // Configurações sensíveis são mascaradas
    const configInfo = {
      questoesSemanais: {
        unlockPolicy: qsConfig.unlockPolicy,
        weekDurationDays: qsConfig.weekDurationDays,
        maxConcurrentAdvances: qsConfig.maxConcurrentAdvances,
        advanceCheckIntervalMs: qsConfig.advanceCheckIntervalMs,
      },
      cache: {
        provider: cacheConfig.provider,
        defaultTTL: cacheConfig.defaultTTL,
        maxKeys: cacheConfig.maxKeys,
        redis: {
          url: cacheConfig.redis.url,
          keyPrefix: cacheConfig.redis.keyPrefix,
          // Não expor credenciais
          hasPassword: !!cacheConfig.redis.password,
          hasUsername: !!cacheConfig.redis.username,
        },
        invalidation: {
          cleanupInterval: cacheConfig.invalidation.cleanupInterval,
        },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };

    const correlationId = req.get('x-correlation-id') ?? undefined;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-feature', 'monitor-config');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    
    res.status(200).json({
      success: true,
      data: configInfo,
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao obter configurações',
      code: 'CONFIG_ERROR',
    });
  }
};

// Criar router Express
const router = express.Router();

// Endpoint público (sem autenticação) para monitoramento
router.get('/', getConfigHandler);

export { router };
