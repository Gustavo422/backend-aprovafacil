import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Schemas de validação
const createPlanoEstudoSchema = z.object({
  usuario_id: z.string().uuid(),
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime(),
  data_fim: z.string().datetime(),
  ativo: z.boolean().default(true),
  meta_horas_diarias: z.number().min(0).max(24).default(2),
  dias_semana: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6, 0]), // 0 = domingo
  observacoes: z.string().optional(),
});

const updatePlanoEstudoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  ativo: z.boolean().optional(),
  meta_horas_diarias: z.number().min(0).max(24).optional(),
  dias_semana: z.array(z.number().min(0).max(6)).optional(),
  observacoes: z.string().optional(),
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
  observacoes: z.string().optional(),
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
  observacoes: z.string().optional(),
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  ativo: z.string().optional().transform(val => val === 'true'),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
});

/**
 * GET /api/plano-estudos - Listar planos de estudo do usuário
 */
export const listPlanosEstudoHandler = async (req: AuthenticatedRequest, res: Response) => {
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

    const { page = 1, limit = 10, ativo, concurso_id, categoria_id } = validationResult.data;

    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
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
        disciplinas_categoria (
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
          criado_em,
          atualizado_em
        )
      `, { count: 'exact' })
      .eq('usuario_id', usuarioId);

    // Aplicar filtros
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    const { data: planos, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar planos de estudo', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    return res.json({
      success: true,
      data: planos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * GET /api/plano-estudos/:id - Buscar plano específico
 */
export const getPlanoEstudoByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
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
        disciplinas_categoria (
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
          criado_em,
          atualizado_em
        )
      `)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Plano de estudo não encontrado', 
        });
      }
      logger.error('Erro ao buscar plano de estudo', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * POST /api/plano-estudos - Criar novo plano
 */
export const createPlanoEstudoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = createPlanoEstudoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const usuarioId = req.user?.id;
    const planoData = { ...validationResult.data, usuario_id: usuarioId };

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const { data: plano, error } = await supabase
      .from('plano_estudos')
      .insert([planoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar plano de estudo', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.status(201).json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota POST /plano-estudos', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * PUT /api/plano-estudos/:id - Atualizar plano
 */
export const updatePlanoEstudoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updatePlanoEstudoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const usuarioId = req.user?.id;
    const updateData = validationResult.data;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const { data: plano, error } = await supabase
      .from('plano_estudos')
      .update(updateData)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Plano de estudo não encontrado', 
        });
      }
      logger.error('Erro ao atualizar plano de estudo', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, data: plano });
  } catch (error) {
    logger.error('Erro na rota PUT /plano-estudos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * DELETE /api/plano-estudos/:id - Deletar plano
 */
export const deletePlanoEstudoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    const { error } = await supabase
      .from('plano_estudos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', usuarioId);

    if (error) {
      logger.error('Erro ao deletar plano de estudo', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, message: 'Plano de estudo deletado com sucesso' });
  } catch (error) {
    logger.error('Erro na rota DELETE /plano-estudos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * POST /api/plano-estudos/:id/itens - Adicionar item ao plano
 */
export const createItemPlanoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: planoId } = req.params;

    // Validate request body
    const validationResult = createItemPlanoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const usuarioId = req.user?.id;
    const itemData = { ...validationResult.data, plano_estudo_id: planoId };

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('usuario_id', usuarioId)
      .single();

    if (planoError || !plano) {
      return res.status(404).json({ 
        success: false,
        error: 'Plano de estudo não encontrado', 
      });
    }

    const { data: item, error } = await supabase
      .from('plano_estudo_itens')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao adicionar item ao plano', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error('Erro na rota POST /plano-estudos/:id/itens', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * PUT /api/plano-estudos/:planoId/itens/:itemId - Atualizar item do plano
 */
export const updateItemPlanoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planoId, itemId } = req.params;

    // Validate request body
    const validationResult = updateItemPlanoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const usuarioId = req.user?.id;
    const updateData = validationResult.data;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('usuario_id', usuarioId)
      .single();

    if (planoError || !plano) {
      return res.status(404).json({ 
        success: false,
        error: 'Plano de estudo não encontrado', 
      });
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
        return res.status(404).json({ 
          success: false,
          error: 'Item não encontrado', 
        });
      }
      logger.error('Erro ao atualizar item do plano', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    logger.error('Erro na rota PUT /plano-estudos/:planoId/itens/:itemId', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * DELETE /api/plano-estudos/:planoId/itens/:itemId - Remover item do plano
 */
export const deleteItemPlanoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planoId, itemId } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    // Verificar se o plano pertence ao usuário
    const { data: plano, error: planoError } = await supabase
      .from('plano_estudos')
      .select('id')
      .eq('id', planoId)
      .eq('usuario_id', usuarioId)
      .single();

    if (planoError || !plano) {
      return res.status(404).json({ 
        success: false,
        error: 'Plano de estudo não encontrado', 
      });
    }

    const { error } = await supabase
      .from('plano_estudo_itens')
      .delete()
      .eq('id', itemId)
      .eq('plano_estudo_id', planoId);

    if (error) {
      logger.error('Erro ao remover item do plano', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    return res.json({ success: true, message: 'Item removido com sucesso' });
  } catch (error) {
    logger.error('Erro na rota DELETE /plano-estudos/:planoId/itens/:itemId', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
};

/**
 * GET /api/plano-estudos/:id/progresso - Progresso do plano
 */
export const getPlanoEstudoProgressoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: planoId } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado', 
      });
    }

    // Buscar itens do plano
    const { data: itens, error } = await supabase
      .from('plano_estudo_itens')
      .select('status, tempo_estimado_minutos')
      .eq('plano_estudo_id', planoId);

    if (error) {
      logger.error('Erro ao buscar progresso do plano', { error: error.message });
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor', 
      });
    }

    // Calcular estatísticas
    const total = itens?.length || 0;
    const concluidos = itens?.filter(item => item.status === 'concluido').length || 0;
    const emAndamento = itens?.filter(item => item.status === 'em_andamento').length || 0;
    const pendentes = itens?.filter(item => item.status === 'pendente').length || 0;

    const progressoPercentual = total > 0 ? (concluidos / total) * 100 : 0;
    const tempoTotalEstimado = itens?.reduce((acc, item) => acc + (item.tempo_estimado_minutos || 0), 0) || 0;

    return res.json({
      success: true,
      data: {
        total,
        concluidos,
        emAndamento,
        pendentes,
        progressoPercentual: Math.round(progressoPercentual * 100) / 100,
        tempoTotalEstimado,
      },
    });
  } catch (error) {
    logger.error('Erro na rota GET /plano-estudos/:id/progresso', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
    });
  }
}; 

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas principais
router.get('/', listPlanosEstudoHandler);
router.get('/:id', getPlanoEstudoByIdHandler);
router.post('/', createPlanoEstudoHandler);
router.put('/:id', updatePlanoEstudoHandler);
router.delete('/:id', deletePlanoEstudoHandler);

// Rotas de itens do plano
router.post('/:planoId/itens', createItemPlanoHandler);
router.put('/:planoId/itens/:itemId', updateItemPlanoHandler);
router.delete('/:planoId/itens/:itemId', deleteItemPlanoHandler);

// Rotas de progresso
router.get('/:id/progresso', getPlanoEstudoProgressoHandler);

export { router };
