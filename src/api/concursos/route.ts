import express from 'express';
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase.js';
import { requestLogger } from '../../middleware/logger.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { 
  validateCreateConcurso, 
  validateUpdateConcurso, 
  validateConcursoFilters, 
  validateConcursoId 
} from '../../validation/concursos.validation.js';
import { logger } from '../../utils/logger.js';
import { ConcursosController } from './concursos.controller.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit); // 100 requests por 15 minutos

// GET /api/concursos - Listar concursos com filtros e paginação
router.get('/', validateConcursoFilters, ConcursosController.listar);

// GET /api/concursos/:id - Buscar concurso por ID
router.get('/:id', validateConcursoId, ConcursosController.buscarPorId);

// POST /api/concursos - Criar novo concurso (requer autenticação)
router.post('/', requireAuth, validateCreateConcurso, ConcursosController.criar);

// PUT /api/concursos/:id - Atualizar concurso (requer autenticação)
router.put('/:id', requireAuth, validateConcursoId, validateUpdateConcurso, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remover o ID dos dados de atualização
    delete updateData.id;

    const { data: concurso, error } = await supabase
      .from('concursos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .single();

    if (error) {
      logger.error('Erro ao atualizar concurso:', undefined, { error });
      
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar concurso'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Concurso atualizado com sucesso',
      data: concurso
    });

  } catch (error) {
    logger.error('Erro ao processar requisição PUT /api/concursos/:id:', undefined, { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// DELETE /api/concursos/:id - Deletar concurso (requer autenticação)
router.delete('/:id', requireAuth, validateConcursoId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('concursos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar concurso:', undefined, { error });
      
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno ao deletar concurso'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Concurso deletado com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao processar requisição DELETE /api/concursos/:id:', undefined, { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// PATCH /api/concursos/:id/activate - Ativar/desativar concurso (requer autenticação)
router.patch('/:id/activate', requireAuth, validateConcursoId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Campo is_active deve ser um boolean'
      });
      return;
    }

    const { data: concurso, error } = await supabase
      .from('concursos')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado'
        });
        return;
      }
      
      logger.error('Erro ao ativar/desativar concurso:', undefined, { error });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao ativar/desativar concurso'
      });
      return;
    }

    res.json({
      success: true,
      message: `Concurso ${is_active ? 'ativado' : 'desativado'} com sucesso`,
      data: concurso
    });

  } catch (error) {
    logger.error('Erro ao processar requisição PATCH /api/concursos/:id/activate:', undefined, { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

export default router;
