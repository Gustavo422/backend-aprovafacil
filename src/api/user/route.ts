import express from 'express';
import { logger } from '../../lib/logger.js';
import { supabase } from '../../config/supabase-unified.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

/**
 * GET /api/user/health - Health check for user routes
 */
export const getUserHealthHandler = (req: express.Request, res: express.Response) => {
  return res.json({ 
    success: true,
    data: {
      status: 'ok', 
      message: 'User routes migrated to main auth system', 
    },
  });
}; 

/**
 * GET /api/user/perfil - Obter perfil do usuário autenticado
 */
export const getUserPerfilHandler = async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nome,
        sobrenome,
        data_nascimento,
        telefone,
        cpf,
        genero,
        ativo,
        criado_em,
        atualizado_em,
        preferencias_concurso:concurso_preferencias (
          id,
          concurso_id,
          ativo,
          criado_em
        )
      `)
      .eq('id', usuarioId)
      .single();

    if (error) {
      logger.error('Erro ao buscar perfil do usuário', { error, usuarioId });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar perfil',
      });
    }

    return res.json({
      success: true,
      data: usuario,
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/user/perfil', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * GET /api/user/estatisticas - Obter estatísticas do usuário
 */
export const getUserEstatisticasHandler = async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Buscar estatísticas básicas do usuário
    const { data: estatisticas, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        criado_em,
        preferencias_concurso:concurso_preferencias (
          id,
          concurso_id,
          ativo
        )
      `)
      .eq('id', usuarioId)
      .single();

    if (error) {
      logger.error('Erro ao buscar estatísticas do usuário', { error, usuarioId });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar estatísticas',
      });
    }

    return res.json({
      success: true,
      data: {
        usuario: estatisticas,
        estatisticas: {
          totalConcursos: estatisticas.preferencias_concurso?.length ?? 0,
          concursoAtivo: estatisticas.preferencias_concurso?.find(p => p.ativo) ?? null,
        },
      },
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/user/estatisticas', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

// Criar router Express
const router = express.Router();

// Registrar rotas
router.get('/health', (req, res) => {
  getUserHealthHandler(req, res);
});
router.get('/perfil', (req, res) => {
  getUserPerfilHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getUserPerfilHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.get('/estatisticas', (req, res) => {
  getUserEstatisticasHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getUserEstatisticasHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

export default router;
