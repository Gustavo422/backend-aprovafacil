import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';
import { logger } from '../../../lib/logger.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// POST - Limpar cache do sistema
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    logger.info('Iniciando limpeza de cache do sistema');

    // Limpar cache de performance
    const { error: performanceError } = await supabase
      .from('user_performance_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos exceto um registro dummy

    if (performanceError) {
      logger.error('Erro ao limpar cache de performance', { error: performanceError });
    } else {
      logger.info('Cache de performance limpo com sucesso');
    }

    // Limpar cache de configuração
    const { error: configError } = await supabase
      .from('cache_config')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (configError) {
      logger.error('Erro ao limpar cache de configuração', { error: configError });
    } else {
      logger.info('Cache de configuração limpo com sucesso');
    }

    // Limpar cache de estatísticas de disciplina
    const { error: statsError } = await supabase
      .from('estatisticas_usuario_disciplina')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (statsError) {
      logger.error('Erro ao limpar estatísticas de disciplina', { error: statsError });
    } else {
      logger.info('Estatísticas de disciplina limpas com sucesso');
    }

    logger.info('Limpeza de cache concluída');

    res.json({
      success: true,
      message: 'Cache do sistema limpo com sucesso',
      details: {
        performanceCache: !performanceError,
        configCache: !configError,
        disciplinaStats: !statsError,
      },
    });

  } catch (error) {
    logger.error('Erro inesperado ao limpar cache', { error });
        
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_FAILED',
        message: 'Erro ao limpar cache do sistema',
      },
    });
  }
});

// GET - Obter estatísticas do cache
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Obter estatísticas do cache
    const { count: performanceCount, error: performanceError } = await supabase
      .from('user_performance_cache')
      .select('*', { count: 'exact', head: true });

    const { count: configCount, error: configError } = await supabase
      .from('cache_config')
      .select('*', { count: 'exact', head: true });

    const { count: disciplinaCount, error: statsError } = await supabase
      .from('estatisticas_usuario_disciplina')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      cacheStats: {
        performanceCache: performanceError ? 0 : performanceCount || 0,
        configCache: configError ? 0 : configCount || 0,
        disciplinaStats: statsError ? 0 : disciplinaCount || 0,
      },
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas do cache', { error });
        
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_STATS_FAILED',
        message: 'Erro ao obter estatísticas do cache',
      },
    });
  }
});

