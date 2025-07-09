import express from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import { applyConcursoFilterToQuery } from '../../utils/concurso-filter.js';

const router = express.Router();

// Schemas de validação
const createFlashcardSchema = z.object({
  front: z.string().min(1, 'Frente é obrigatória'),
  back: z.string().min(1, 'Verso é obrigatório'),
  disciplina: z.string().min(1, 'Disciplina é obrigatória'),
  tema: z.string().min(1, 'Tema é obrigatório'),
  subtema: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  peso_disciplina: z.number().min(1).max(100).optional(),
  is_active: z.boolean().default(true)
});

const updateFlashcardSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  disciplina: z.string().min(1).optional(),
  tema: z.string().min(1).optional(),
  subtema: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  peso_disciplina: z.number().min(1).max(100).optional(),
  is_active: z.boolean().optional()
});

// GET /api/flashcards - Listar flashcards
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, disciplina, tema, subtema, is_active } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

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
        concurso_categorias (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `, { count: 'exact' });

    // Aplicar filtro por concurso do usuário
    query = await applyConcursoFilterToQuery(supabase, userId, query, 'flashcards');

    // Aplicar filtros adicionais
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
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

    const { data: flashcards, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar flashcards:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: flashcards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Erro na rota GET /flashcards:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
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
        concurso_categorias (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .eq('id', id);

    // Aplicar filtro por concurso do usuário
    query = await applyConcursoFilterToQuery(supabase, userId, query, 'flashcards');

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
router.post('/', requireAuth, validateRequest(createFlashcardSchema), async (req, res) => {
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
router.put('/:id', requireAuth, validateRequest(updateFlashcardSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se o flashcard existe e pertence ao concurso do usuário
    let query = supabase
      .from('flashcards')
      .select('id')
      .eq('id', id);

    query = await applyConcursoFilterToQuery(supabase, userId, query, 'flashcards');

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

    // Verificar se o flashcard existe e pertence ao concurso do usuário
    let query = supabase
      .from('flashcards')
      .select('id')
      .eq('id', id);

    query = await applyConcursoFilterToQuery(supabase, userId, query, 'flashcards');

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
    query = await applyConcursoFilterToQuery(supabase, userId, query, 'flashcards');

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
