import express from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Schemas de validação
const createMapaAssuntoSchema = z.object({
  user_id: z.string().uuid(),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(255),
  disciplina: z.string().min(1, 'Disciplina é obrigatória').max(100),
  categoria_id: z.string().uuid().optional(),
  concurso_id: z.string().uuid().optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'revisao']).default('pendente'),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  observacoes: z.string().optional(),
  progresso_percentual: z.number().min(0).max(100).default(0)
});

const updateMapaAssuntoSchema = z.object({
  assunto: z.string().min(1).max(255).optional(),
  disciplina: z.string().min(1).max(100).optional(),
  categoria_id: z.string().uuid().optional(),
  concurso_id: z.string().uuid().optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'revisao']).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  observacoes: z.string().optional(),
  progresso_percentual: z.number().min(0).max(100).optional()
});

// GET /api/mapa-assuntos - Listar mapa de assuntos do usuário
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status, disciplina, categoria_id, concurso_id } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('mapa_assuntos')
      .select(`
        *,
        categoria_disciplinas (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }

    const { data: assuntos, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar mapa de assuntos:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: assuntos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Erro na rota GET /mapa-assuntos:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/mapa-assuntos/:id - Buscar assunto específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: assunto, error } = await supabase
      .from('mapa_assuntos')
      .select(`
        *,
        categoria_disciplinas (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao buscar assunto:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: assunto });
  } catch (error) {
    logger.error('Erro na rota GET /mapa-assuntos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/mapa-assuntos - Criar novo assunto
router.post('/', requireAuth, validateRequest(createMapaAssuntoSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const assuntoData = { ...req.body, user_id: userId };

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: assunto, error } = await supabase
      .from('mapa_assuntos')
      .insert([assuntoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar assunto:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: assunto });
  } catch (error) {
    logger.error('Erro na rota POST /mapa-assuntos:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/mapa-assuntos/:id - Atualizar assunto
router.put('/:id', requireAuth, validateRequest(updateMapaAssuntoSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: assunto, error } = await supabase
      .from('mapa_assuntos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao atualizar assunto:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: assunto });
  } catch (error) {
    logger.error('Erro na rota PUT /mapa-assuntos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/mapa-assuntos/:id - Deletar assunto
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { error } = await supabase
      .from('mapa_assuntos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao deletar assunto:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro na rota DELETE /mapa-assuntos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/mapa-assuntos/stats/resumo - Resumo estatístico
router.get('/stats/resumo', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Buscar estatísticas por status
    const { data: stats, error } = await supabase
      .from('mapa_assuntos')
      .select('status, progresso_percentual')
      .eq('user_id', userId);

    if (error) {
      logger.error('Erro ao buscar estatísticas:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Calcular estatísticas
    const total = stats?.length || 0;
    const porStatus = {
      pendente: stats?.filter(s => s.status === 'pendente').length || 0,
      em_andamento: stats?.filter(s => s.status === 'em_andamento').length || 0,
      concluido: stats?.filter(s => s.status === 'concluido').length || 0,
      revisao: stats?.filter(s => s.status === 'revisao').length || 0
    };

    const progressoMedio = stats?.length > 0 
      ? stats.reduce((acc, curr) => acc + (curr.progresso_percentual || 0), 0) / stats.length 
      : 0;

    res.json({
      success: true,
      data: {
        total,
        porStatus,
        progressoMedio: Math.round(progressoMedio * 100) / 100
      }
    });
  } catch (error) {
    logger.error('Erro na rota GET /mapa-assuntos/stats/resumo:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 