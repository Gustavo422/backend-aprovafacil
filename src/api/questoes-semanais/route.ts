import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';

// Validation schemas
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  ativo: z.string().optional().transform(val => val === 'true'),
  disciplina: z.string().optional(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
});

/**
 * GET /api/questoes-semanais - Listar questões semanais
 */
export const listQuestoesSemanaisHandler = async (req: Request, res: Response) => {
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

    const { page = 1, limit = 10, ativo, disciplina, dificuldade, concurso_id, categoria_id } = validationResult.data;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }
    if (dificuldade) {
      query = query.eq('dificuldade', dificuldade);
    }
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }

    const { data: questoes, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar questões semanais', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    return res.json({
      success: true,
      data: questoes || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Erro na rota GET /questoes-semanais', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * GET /api/questoes-semanais/:id - Buscar questão específica
 */
export const getQuestaoSemanalByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: questao, error } = await supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Erro ao buscar questão semanal', { error: error.message, id });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    if (!questao) {
      return res.status(404).json({ 
        success: false,
        error: 'Questão semanal não encontrada', 
      });
    }

    return res.json({
      success: true,
      data: questao,
    });
  } catch (error) {
    logger.error('Erro na rota GET /questoes-semanais/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas
router.get('/', listQuestoesSemanaisHandler);
router.get('/:id', getQuestaoSemanalByIdHandler);

export { router };
