import express from 'express';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  validateCreateFlashcard,
  validateUpdateFlashcard
} from '../../validation/flashcards.validation.js';
import { logger } from '../../utils/logger.js';
import { getUserConcurso } from '../../utils/concurso-filter.js';

const router = express.Router();

// GET /api/flashcards - Listar flashcards com filtros e paginação
router.get('/', requireAuth, async (req, res) => {
  logger.info('Início da requisição GET /api/flashcards', 'backend', { query: req.query, user: req.user?.id });

  try {
    const { 
      ativo, 
      disciplina, 
      tema, 
      subtema, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Obter o usuário autenticado
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    // Aplicar filtro automático por concurso do usuário
    const concursoId = await getUserConcurso(supabase, userId);
    if (concursoId) {
      logger.debug('Concurso do usuário obtido', 'backend', { concursoId });
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
      query = query.eq('ativo', ativo === 'true');
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
    logger.debug('Executando query para flashcards', 'backend', { filters: { ativo, disciplina, tema, subtema }, offset, limit: Number(limit) });
    const { data: flashcards, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      logger.error('Erro ao executar query Supabase para flashcards', 'backend', { error: error.message, details: error.details, hint: error.hint, filters: { ativo, disciplina, tema, subtema } });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar flashcards'
      });
      return;
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

    logger.info('Resposta de flashcards preparada', 'backend', { total: count || 0, page: Number(page), resultsCount: flashcards?.length || 0 });
    res.json({
      success: true,
      data: flashcards || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/flashcards', 'backend', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// GET /api/flashcards/:id - Buscar flashcard específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId = await getUserConcurso(supabase, userId);

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
        res.status(404).json({ error: 'Flashcard não encontrado' });
        return;
      }
      logger.error('Erro ao buscar flashcard:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota GET /flashcards/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/flashcards - Criar novo flashcard
router.post('/', requireAuth, validateCreateFlashcard, async (req, res) => {
  try {
    const flashcardData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .insert([flashcardData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar flashcard:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota POST /flashcards:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/flashcards/:id - Atualizar flashcard
router.put('/:id', requireAuth, validateUpdateFlashcard, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId = await getUserConcurso(supabase, userId);

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
      res.status(404).json({ error: 'Flashcard não encontrado' });
      return;
    }

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar flashcard:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: flashcard });
  } catch (error) {
    logger.error('Erro na rota PUT /flashcards/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/flashcards/:id - Deletar flashcard
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId = await getUserConcurso(supabase, userId);

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
      res.status(404).json({ error: 'Flashcard não encontrado' });
      return;
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar flashcard:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro na rota DELETE /flashcards/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/flashcards/stats/disciplinas - Estatísticas por disciplina
router.get('/stats/disciplinas', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    let query = supabase
      .from('flashcards')
      .select('disciplina, peso_disciplina');

    // Aplicar filtro por concurso do usuário
    const concursoId = await getUserConcurso(supabase, userId);
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    const { data: flashcards, error } = await query;

    if (error) {
      logger.error('Erro ao buscar estatísticas de flashcards:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Agrupar por disciplina
    const stats = new Map();
    flashcards?.forEach(flashcard => {
      const disciplina = flashcard.disciplina;
      if (!stats.has(disciplina)) {
        stats.set(disciplina, {
          disciplina,
          total_flashcards: 0,
          peso_total: 0
        });
      }
      
      const disciplinaStats = stats.get(disciplina);
      disciplinaStats.total_flashcards += 1;
      disciplinaStats.peso_total += flashcard.peso_disciplina || 1;
    });

    const statsArray = Array.from(stats.values())
      .sort((a, b) => b.total_flashcards - a.total_flashcards);

    res.json({
      success: true,
      data: statsArray
    });
  } catch (error) {
    logger.error('Erro na rota GET /flashcards/stats/disciplinas:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;