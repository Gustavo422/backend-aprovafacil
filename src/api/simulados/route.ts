import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import {
  CreateSimuladoDTO,
  UpdateSimuladoDTO,
  SimuladoFiltersDTO,
  PaginatedSimuladosResponseDTO,
  SimuladoWithRelationsDTO,
  CreateSimuladoQuestaoDTO,
  UpdateSimuladoQuestaoDTO,
  CreateusuariosimuladoProgressDTO,
  UpdateusuariosimuladoProgressDTO
} from '../../types/simulados.dto.js';
import { asyncHandler } from '../../utils/routeWrapper.js';

const router = express.Router();

// Schemas de validação
const createSimuladoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  tempo_duracao_minutos: z.number().min(1, 'Tempo de duração deve ser maior que 0'),
  total_questoes: z.number().min(1, 'Total de questões deve ser maior que 0'),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true)
});

const updateSimuladoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  tempo_duracao_minutos: z.number().min(1).optional(),
  total_questoes: z.number().min(1).optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().optional()
});

const createQuestaoSchema = z.object({
  simulado_id: z.string().uuid(),
  enunciado: z.string().min(1, 'Enunciado é obrigatório'),
  alternativas: z.record(z.unknown()),
  resposta_correta: z.string().min(1, 'Resposta correta é obrigatória'),
  explicacao: z.string().optional(),
  disciplina: z.string().optional(),
  assunto: z.string().optional(),
  dificuldade: z.string().default('medio'),
  ordem: z.number().min(1).optional(),
  peso_disciplina: z.number().min(0).max(100).optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional()
});

const createProgressSchema = z.object({
  user_id: z.string().uuid(),
  simulado_id: z.string().uuid(),
  data_inicio: z.string().datetime().optional(),
  tempo_gasto_minutos: z.number().min(0).optional(),
  acertos: z.number().min(0).optional(),
  erros: z.number().min(0).optional(),
  pontuacao: z.number().min(0).optional(),
  is_concluido: z.boolean().default(false)
});

// Middleware de validação Express local
const createValidationMiddleware = (schema: z.ZodTypeAny, field: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body : field === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      if (field === 'body') {
        req.body = result.data;
      } else if (field === 'query') {
        req.query = result.data as Record<string, string | string[] | undefined>;
      } else {
        req.params = result.data as Record<string, string>;
      }
      next();
    } catch {
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// GET /api/simulados - Listar simulados com paginação e filtros
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      concurso_id,
      categoria_id,
      ativo,
      search
    } = req.query as SimuladoFiltersDTO;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('simulados')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
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
      `, { count: 'exact' });

    // Aplicar filtros
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }
    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { data: simulados, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar simulados:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    const response: PaginatedSimuladosResponseDTO = {
      success: true,
      data: simulados as SimuladoWithRelationsDTO[],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    };

    res.json(response);
  } catch {
    logger.error('Erro na rota GET /simulados:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/simulados/:id - Buscar simulado por ID
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
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
        ),
        simulado_questoes (
          id,
          enunciado,
          alternativas,
          resposta_correta,
          explicacao,
          disciplina,
          assunto,
          dificuldade,
          ordem,
          peso_disciplina,
          concurso_id,
          categoria_id,
          criado_em,
          atualizado_em
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulado não encontrado' });
      }
      logger.error('Erro ao buscar simulado:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota GET /simulados/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// POST /api/simulados - Criar novo simulado
router.post('/', requireAuth, createValidationMiddleware(createSimuladoSchema, 'body'), asyncHandler(async (req, res) => {
  try {
    const simuladoData: CreateSimuladoDTO = req.body;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .insert([simuladoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar simulado:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.status(201).json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota POST /simulados:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// PUT /api/simulados/:id - Atualizar simulado
router.put('/:id', requireAuth, createValidationMiddleware(updateSimuladoSchema, 'body'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: UpdateSimuladoDTO = req.body;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulado não encontrado' });
      }
      logger.error('Erro ao atualizar simulado:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota PUT /simulados/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// DELETE /api/simulados/:id - Deletar simulado
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('simulados')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar simulado:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true, message: 'Simulado deletado com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// POST /api/simulados/:id/questoes - Adicionar questão ao simulado
router.post('/:id/questoes', requireAuth, createValidationMiddleware(createQuestaoSchema, 'body'), asyncHandler(async (req, res) => {
  try {
    const { id: simuladoId } = req.params;
    const questaoData: CreateSimuladoQuestaoDTO = {
      ...req.body,
      simulado_id: simuladoId
    };

    const { data: questao, error } = await supabase
      .from('simulado_questoes')
      .insert([questaoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao adicionar questão:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.status(201).json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/questoes:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// PUT /api/simulados/:simuladoId/questoes/:questaoId - Atualizar questão
router.put('/:simuladoId/questoes/:questaoId', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { simuladoId, questaoId } = req.params;
    const updateData: UpdateSimuladoQuestaoDTO = req.body;

    const { data: questao, error } = await supabase
      .from('simulado_questoes')
      .update(updateData)
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Questão não encontrada' });
      }
      logger.error('Erro ao atualizar questão:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/questoes/:questaoId:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// DELETE /api/simulados/:simuladoId/questoes/:questaoId - Remover questão
router.delete('/:simuladoId/questoes/:questaoId', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { simuladoId, questaoId } = req.params;

    const { error } = await supabase
      .from('simulado_questoes')
      .delete()
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId);

    if (error) {
      logger.error('Erro ao remover questão:', undefined, { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true, message: 'Questão removida com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:simuladoId/questoes/:questaoId:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// POST /api/simulados/:id/progresso - Iniciar progresso do usuário
router.post('/:id/progresso', requireAuth, createValidationMiddleware(createProgressSchema, 'body'), async (req, res) => {
  try {
    const { id: simuladoId } = req.params;
    const progressData: CreateusuariosimuladoProgressDTO = {
      ...req.body,
      simulado_id: simuladoId,
      data_inicio: req.body.data_inicio || new Date().toISOString()
    };

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .insert([progressData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar progresso:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/progresso:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/simulados/:simuladoId/progresso/:progressId - Atualizar progresso
router.put('/:simuladoId/progresso/:progressId', requireAuth, async (req, res) => {
  try {
    const { simuladoId, progressId } = req.params;
    const updateData: UpdateusuariosimuladoProgressDTO = req.body;

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .update(updateData)
      .eq('id', progressId)
      .eq('simulado_id', simuladoId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Progresso não encontrado' });
        return;
      }
      logger.error('Erro ao atualizar progresso:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/progresso/:progressId:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/simulados/:id/progresso - Buscar progresso do usuário
router.get('/:id/progresso', requireAuth, async (req, res) => {
  try {
    const { id: simuladoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .select('*')
      .eq('simulado_id', simuladoId)
      .eq('user_id', userId)
      .order('criado_em', { ascending: false });

    if (error) {
      logger.error('Erro ao buscar progresso:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota GET /simulados/:id/progresso:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;