import express from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Schemas de validação
const createPlanoEstudoSchema = z.object({
  user_id: z.string().uuid(),
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime(),
  data_fim: z.string().datetime(),
  is_active: z.boolean().default(true),
  meta_horas_diarias: z.number().min(0).max(24).default(2),
  dias_semana: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6, 0]), // 0 = domingo
  observacoes: z.string().optional()
});

const updatePlanoEstudoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
  meta_horas_diarias: z.number().min(0).max(24).optional(),
  dias_semana: z.array(z.number().min(0).max(6)).optional(),
  observacoes: z.string().optional()
});

const createItemPlanoSchema = z.object({
  plano_estudo_id: z.string().uuid(),
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  tipo: z.enum(['assunto', 'questao', 'simulado', 'revisao']),
  disciplina: z.string().min(1, 'Disciplina é obrigatória').max(100),
  assunto: z.string().optional(),
  ordem: z.number().min(1).default(1),
  tempo_estimado_minutos: z.number().min(0).default(60),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  status: z.enum(['pendente', 'em_andamento', 'concluido']).default('pendente'),
  data_prevista: z.string().datetime().optional(),
  observacoes: z.string().optional()
});

const updateItemPlanoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  tipo: z.enum(['assunto', 'questao', 'simulado', 'revisao']).optional(),
  disciplina: z.string().min(1).max(100).optional(),
  assunto: z.string().optional(),
  ordem: z.number().min(1).optional(),
  tempo_estimado_minutos: z.number().min(0).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluido']).optional(),
  data_prevista: z.string().datetime().optional(),
  observacoes: z.string().optional()
});

// GET /api/plano-estudos - Listar planos de estudo do usuário
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, is_active, concurso_id, categoria_id } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('plano_estudos')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        categoria_disciplinas (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        plano_estudo_itens (
          id,
          titulo,
          descricao,
          tipo,
          disciplina,
          assunto,
          ordem,
          tempo_estimado_minutos,
          prioridade,
          status,
          data_prevista,
          created_at,
          updated_at
        )
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Aplicar filtros
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    const { data: planos, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar planos de estudo:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: planos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/plano-estudos/:id - Buscar plano específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: plano, error } = await supabase
      .from('plano_estudos')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        categoria_disciplinas (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        plano_estudo_itens (
          id,
          titulo,
          descricao,
          tipo,
          disciplina,
          assunto,
          ordem,
          tempo_estimado_minutos,
          prioridade,
          status,
          data_prevista,
          observacoes,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Plano de estudo não encontrado' });
        return;
      }
      logger.error('Erro ao buscar plano de estudo:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/plano-estudos - Criar novo plano
router.post('/', requireAuth, validateRequest(createPlanoEstudoSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const planoData = { ...req.body, user_id: userId };

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: plano, error } = await supabase
      .from('plano_estudos')
      .insert([planoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar plano de estudo:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota POST /plano-estudos:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/plano-estudos/:id - Atualizar plano
router.put('/:id', requireAuth, validateRequest(updatePlanoEstudoSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: plano, error } = await supabase
      .from('plano_estudos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Plano de estudo não encontrado' });
        return;
      }
      logger.error('Erro ao atualizar plano de estudo:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota PUT /plano-estudos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/plano-estudos/:id - Deletar plano
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { error } = await supabase
      .from('plano_estudos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error('Erro ao deletar plano de estudo:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, message: 'Plano de estudo deletado com sucesso' });
  } catch (error) {
    logger.error('Erro na rota DELETE /plano-estudos/:id:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/plano-estudos/:id/itens - Adicionar item ao plano
router.post('/:id/itens', requireAuth, validateRequest(createItemPlanoSchema), async (req, res) => {
  try {
    const { id: planoId } = req.params;
    const userId = req.user?.id;
    const itemData = { ...req.body, plano_estudo_id: planoId };

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('user_id', userId)
      .single();

    if (planoError || !plano) {
      res.status(404).json({ error: 'Plano de estudo não encontrado' });
      return;
    }

    const { data: item, error } = await supabase
      .from('plano_estudo_itens')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao adicionar item ao plano:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error('Erro na rota POST /plano-estudos/:id/itens:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/plano-estudos/:planoId/itens/:itemId - Atualizar item do plano
router.put('/:planoId/itens/:itemId', requireAuth, validateRequest(updateItemPlanoSchema), async (req, res) => {
  try {
    const { planoId, itemId } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('user_id', userId)
      .single();

    if (planoError || !plano) {
      res.status(404).json({ error: 'Plano de estudo não encontrado' });
      return;
    }

    const { data: item, error } = await supabase
      .from('plano_estudo_itens')
      .update(updateData)
      .eq('id', itemId)
      .eq('plano_estudo_id', planoId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Item não encontrado' });
        return;
      }
      logger.error('Erro ao atualizar item do plano:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error('Erro na rota PUT /plano-estudos/:planoId/itens/:itemId:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/plano-estudos/:planoId/itens/:itemId - Remover item do plano
router.delete('/:planoId/itens/:itemId', requireAuth, async (req, res) => {
  try {
    const { planoId, itemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('user_id', userId)
      .single();

    if (planoError || !plano) {
      res.status(404).json({ error: 'Plano de estudo não encontrado' });
      return;
    }

    const { error } = await supabase
      .from('plano_estudo_itens')
      .delete()
      .eq('id', itemId)
      .eq('plano_estudo_id', planoId);

    if (error) {
      logger.error('Erro ao remover item do plano:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, message: 'Item removido com sucesso' });
  } catch (error) {
    logger.error('Erro na rota DELETE /plano-estudos/:planoId/itens/:itemId:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/plano-estudos/:id/progresso - Progresso do plano
router.get('/:id/progresso', requireAuth, async (req, res) => {
  try {
    const { id: planoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Buscar itens do plano
    const { data: itens, error } = await supabase
      .from('plano_estudo_itens')
      .select('status, tempo_estimado_minutos')
      .eq('plano_estudo_id', planoId);

    if (error) {
      logger.error('Erro ao buscar progresso do plano:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Calcular estatísticas
    const total = itens?.length || 0;
    const concluidos = itens?.filter(item => item.status === 'concluido').length || 0;
    const emAndamento = itens?.filter(item => item.status === 'em_andamento').length || 0;
    const pendentes = itens?.filter(item => item.status === 'pendente').length || 0;

    const progressoPercentual = total > 0 ? (concluidos / total) * 100 : 0;
    const tempoTotalEstimado = itens?.reduce((acc, item) => acc + (item.tempo_estimado_minutos || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        total,
        concluidos,
        emAndamento,
        pendentes,
        progressoPercentual: Math.round(progressoPercentual * 100) / 100,
        tempoTotalEstimado
      }
    });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos/:id/progresso:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 