import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { getUserConcurso } from '../../utils/concurso-filter.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Validation schemas
const createFlashcardSchema = z.object({
  pergunta: z.string().min(1),
  resposta: z.string().min(1),
  disciplina: z.string().min(1),
  tema: z.string().min(1),
  subtema: z.string().optional(),
  peso_disciplina: z.number().min(0).default(1),
  ativo: z.boolean().default(true),
  concurso_id: z.string().uuid(),
  categoria_id: z.string().uuid().optional(),
});

const updateFlashcardSchema = z.object({
  pergunta: z.string().min(1).optional(),
  resposta: z.string().min(1).optional(),
  disciplina: z.string().min(1).optional(),
  tema: z.string().min(1).optional(),
  subtema: z.string().optional(),
  peso_disciplina: z.number().min(0).optional(),
  ativo: z.boolean().optional(),
  categoria_id: z.string().uuid().optional(),
});

const querySchema = z.object({
  ativo: z.string().optional().transform(val => val === 'true'),
  disciplina: z.string().optional(),
  tema: z.string().optional(),
  subtema: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

/**
 * GET /api/flashcards - Listar flashcards com filtros e paginação
 */
export const listFlashcardsHandler = async (req: AuthenticatedRequest, res: Response) => {
  logger.info('Início da requisição GET /api/flashcards', { query: req.query, user: req.user?.id });

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

    const { 
      ativo, 
      disciplina, 
      tema, 
      subtema, 
      page = 1, 
      limit = 20, 
    } = validationResult.data;

    // Obter o usuário autenticado
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Aplicar filtro automático por concurso do usuário
    const concursoId = await getUserConcurso(supabase, usuarioId);
    if (concursoId) {
      logger.debug('Concurso do usuário obtido', { concursoId });
    }

    let query = supabase
      .from('flashcards')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        categorias_concursos (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `);

    // Aplicar filtro automático por concurso do usuário
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    // Aplicar filtros adicionais
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }

    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }

    if (tema) {
      query = query.ilike('tema', `%${tema}%`);
    }

    if (subtema) {
      query = query.ilike('subtema', `%${subtema}%`);
    }

    // Calcular offset para paginação
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Buscar dados com paginação
    logger.debug('Executando query para flashcards', { filters: { ativo, disciplina, tema, subtema }, offset, limit: Number(limit) });
    const { data: flashcards, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      logger.error('Erro ao executar query Supabase para flashcards', { error: error.message, details: error.details, hint: error.hint, filters: { ativo, disciplina, tema, subtema } });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar flashcards',
      });
    }

    // Buscar total de registros para paginação
    let totalCount = 0;
    if (count === null) {
      const { count: total } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true });
      totalCount = total || 0;
    } else {
      totalCount = count;
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Resposta de flashcards preparada', { total: count || 0, page: Number(page), resultsCount: flashcards?.length || 0 });
    return res.json({
      success: true,
      data: flashcards || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
      },
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/flashcards', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * GET /api/flashcards/:id - Buscar flashcard específico
 */
export const getFlashcardByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const concursoId = await getUserConcurso(supabase, usuarioId);

    let query = supabase
      .from('flashcards')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        categorias_concursos (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .eq('id', id);

    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    const { data: flashcard, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Flashcard não encontrado', 
        });
      }
      logger.error('Erro ao buscar flashcard', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota GET /flashcards/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * POST /api/flashcards - Criar novo flashcard
 */
export const createFlashcardHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = createFlashcardSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const flashcardData = validationResult.data;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .insert([flashcardData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar flashcard', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.status(201).json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota POST /flashcards', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * PUT /api/flashcards/:id - Atualizar flashcard
 */
export const updateFlashcardHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateFlashcardSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const updateData = validationResult.data;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const concursoId = await getUserConcurso(supabase, usuarioId);

    // Verificar se o flashcard existe e pertence ao concurso do usuário
    let query = supabase
      .from('flashcards')
      .select('id')
      .eq('id', id);

    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    const { data: existingFlashcard, error: checkError } = await query.single();

    if (checkError || !existingFlashcard) {
      return res.status(404).json({ 
        success: false,
        error: 'Flashcard não encontrado', 
      });
    }

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar flashcard', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota PUT /flashcards/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * DELETE /api/flashcards/:id - Deletar flashcard
 */
export const deleteFlashcardHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const concursoId = await getUserConcurso(supabase, usuarioId);

    // Verificar se o flashcard existe e pertence ao concurso do usuário
    let query = supabase
      .from('flashcards')
      .select('id')
      .eq('id', id);

    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    const { data: existingFlashcard, error: checkError } = await query.single();

    if (checkError || !existingFlashcard) {
      return res.status(404).json({ 
        success: false,
        error: 'Flashcard não encontrado', 
      });
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar flashcard', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Erro na rota DELETE /flashcards/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * GET /api/flashcards/stats/disciplinas - Estatísticas por disciplina
 */
export const getFlashcardStatsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    let query = supabase
      .from('flashcards')
      .select('disciplina, peso_disciplina');

    // Aplicar filtro por concurso do usuário
    const concursoId = await getUserConcurso(supabase, usuarioId);
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    const { data: flashcards, error } = await query;

    if (error) {
      logger.error('Erro ao buscar estatísticas de flashcards', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    // Agrupar por disciplina
    const stats = new Map();
    flashcards?.forEach(flashcard => {
      const disciplina = flashcard.disciplina;
      if (!stats.has(disciplina)) {
        stats.set(disciplina, {
          disciplina,
          total_flashcards: 0,
          peso_total: 0,
        });
      }
      
      const disciplinaStats = stats.get(disciplina);
      disciplinaStats.total_flashcards += 1;
      disciplinaStats.peso_total += flashcard.peso_disciplina || 1;
    });

    const statsArray = Array.from(stats.values())
      .sort((a, b) => b.total_flashcards - a.total_flashcards);

    return res.json({
      success: true,
      data: statsArray,
    });
  } catch (error) {
    logger.error('Erro na rota GET /flashcards/stats/disciplinas', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
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
router.get('/', listFlashcardsHandler);
router.get('/:id', getFlashcardByIdHandler);
router.post('/', createFlashcardHandler);
router.put('/:id', updateFlashcardHandler);
router.delete('/:id', deleteFlashcardHandler);
router.get('/stats/disciplinas', getFlashcardStatsHandler);

export { router };
