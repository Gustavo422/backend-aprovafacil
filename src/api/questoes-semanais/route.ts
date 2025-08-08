import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { getConcursoIdFromRequest } from '../../middleware/global-concurso-filter.middleware.js';
import { requireAuth } from '../../middleware/auth.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Tipos para o retorno do Supabase
interface QuestaoSemanal {
  id: string;
  titulo: string;
  enunciado: string;
  disciplina: string;
  dificuldade: 'facil' | 'medio' | 'dificil';
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano?: number;
    banca?: string;
  };
}

// Validation schemas
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  ativo: z.string().optional().transform(val => val === 'true'),
  disciplina: z.string().optional(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  categoria_id: z.string().uuid().optional(),
});

/**
 * GET /api/questoes-semanais - Listar questões semanais
 */
export const listQuestoesSemanaisHandler = async (req: AuthenticatedRequest, res: Response) => {
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

    const { page = 1, limit = 10, ativo, disciplina, dificuldade } = validationResult.data;

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

    // O filtro de concurso é aplicado automaticamente pelo middleware global
    const concursoId = getConcursoIdFromRequest(req);
    if (concursoId) {
      logger.debug('Filtro de concurso aplicado automaticamente pelo middleware', { concursoId });
    }
    
    // Aplicar filtros adicionais
    if (typeof ativo === 'boolean') {
      query = query.eq('ativo', ativo);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }
    if (dificuldade) {
      query = query.eq('dificuldade', dificuldade);
    }

    const { data: questoes, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1) as { data: QuestaoSemanal[] | null; error: Error | null; count: number | null };

    if (error) {
      logger.error('Erro ao buscar questões semanais', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    const totalPages = Math.ceil((count ?? 0) / Number(limit));

    return res.json({
      success: true,
      data: questoes ?? [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count ?? 0,
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
export const getQuestaoSemanalByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
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
      .single() as { data: QuestaoSemanal | null; error: Error | null };

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
const router = express.Router();  

// Aplicar middleware de autenticação em todas as rotas
router.use(requireAuth);

// Registrar rotas
router.get('/', listQuestoesSemanaisHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
router.get('/:id', getQuestaoSemanalByIdHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

export { router };
