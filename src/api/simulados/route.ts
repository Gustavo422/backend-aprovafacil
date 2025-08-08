import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { getConcursoIdFromRequest } from '../../middleware/global-concurso-filter.middleware.js';
import type {
  UpdateSimuladoDTO,
  SimuladoFiltersDTO,
  PaginatedSimuladosResponseDTO,
  SimuladoWithRelationsDTO,
  CreateSimuladoQuestaoDTO,
  UpdateSimuladoQuestaoDTO,
  UpdateusuariosimuladoProgressDTO,
} from '../../types/simulados.dto.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
  concursoId?: string | null;
}

// Schemas de validação
const createSimuladoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  tempo_duracao_minutos: z.number().min(1, 'Tempo de duração deve ser maior que 0'),
  total_questoes: z.number().min(1, 'Total de questões deve ser maior que 0'),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
});

const updateSimuladoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  tempo_duracao_minutos: z.number().min(1).optional(),
  total_questoes: z.number().min(1).optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
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
  categoria_id: z.string().uuid().optional(),
});

const createProgressSchema = z.object({
  usuario_id: z.string().uuid(),
  simulado_id: z.string().uuid(),
  data_inicio: z.string().datetime().optional(),
  tempo_gasto_minutos: z.number().min(0).optional(),
  acertos: z.number().min(0).optional(),
  erros: z.number().min(0).optional(),
  pontuacao: z.number().min(0).optional(),
  is_concluido: z.boolean().default(false),
});

/**
 * GET /api/simulados - Listar simulados com paginação e filtros
 */
export const getSimuladosHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.debug('getSimuladosHandler - Iniciando', {
      user: req.user,
      concursoId: req.concursoId,
      hasAuth: req.headers.authorization ? 'presente' : 'ausente',
    });
    
    const {
      page = 1,
      limit = 10,
      // categoria_id,
      // ativo,
      // search,
    } = req.query as unknown as SimuladoFiltersDTO;

    const offset = (Number(page) - 1) * Number(limit);

    // Remover variável não utilizada
    // let query = supabase
    //   .from('simulados')
    //   .select(`
    //     *,
    //     categorias_concursos (
    //       id,
    //       nome,
    //       slug,
    //       descricao,
    //       cor_primaria,
    //       cor_secundaria
    //     ),
    //     concursos (
    //       id,
    //       nome,
    //       descricao,
    //       ano,
    //       banca
    //     )
    //   `, { count: 'exact' });

    // Aplicar filtro de concurso
    const concursoId = getConcursoIdFromRequest(req);
    logger.debug('concursoId obtido', { concursoId });
    
    if (!concursoId) {
      logger.warn('Nenhum concurso configurado para o usuário');
      return res.status(400).json({
        success: false,
        error: 'Concurso não configurado. Selecione um concurso primeiro.',
        code: 'CONCURSO_NOT_CONFIGURED',
      });
    }

    const { data: simulados, error, count } = await supabase
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
      `, { count: 'exact' })
      .eq('concurso_id', concursoId)
      .range(offset, offset + Number(limit) - 1) as { data: SimuladoWithRelationsDTO[] | null; error: Error | null; count: number | null };

    if (error) {
      logger.error('Erro ao buscar simulados', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const simuladosData = simulados;
    const countData = count;

    const totalPages = Math.ceil((countData ?? 0) / Number(limit));

    const response: PaginatedSimuladosResponseDTO = {
      success: true,
      data: simuladosData ?? [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countData ?? 0,
        totalPages,
      },
    };

    return res.json(response);
  } catch {
    logger.error('Erro na rota GET /simulados', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * GET /api/simulados/:id - Buscar simulado por ID
 */
export const getSimuladoByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
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
      .single() as { data: SimuladoWithRelationsDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulado não encontrado' });
      }
      logger.error('Erro ao buscar simulado', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota GET /simulados/:id', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * POST /api/simulados - Criar novo simulado
 */
export const createSimuladoHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createSimuladoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }

    const simuladoData = validationResult.data;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .insert([simuladoData])
      .select()
      .single() as { data: SimuladoWithRelationsDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao criar simulado', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(201).json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota POST /simulados', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * PUT /api/simulados/:id - Atualizar simulado
 */
export const updateSimuladoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateSimuladoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }

    const updateData: UpdateSimuladoDTO = validationResult.data;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as { data: SimuladoWithRelationsDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulado não encontrado' });
      }
      logger.error('Erro ao atualizar simulado', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota PUT /simulados/:id', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * DELETE /api/simulados/:id - Deletar simulado
 */
export const deleteSimuladoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('simulados')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar simulado', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, message: 'Simulado deletado com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:id', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * POST /api/simulados/:id/questoes - Adicionar questão ao simulado
 */
export const addQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const { id: simuladoId } = req.params;

    // Validate request body
    const validationResult = createQuestaoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }

    const questaoData: CreateSimuladoQuestaoDTO = {
      ...validationResult.data,
      simulado_id: simuladoId as string,
    };

    const { data: questao, error } = await supabase
      .from('simulado_questoes')
      .insert([questaoData])
      .select()
      .single() as { data: CreateSimuladoQuestaoDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao adicionar questão', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(201).json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/questoes', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * PUT /api/simulados/:simuladoId/questoes/:questaoId - Atualizar questão
 */
export const updateQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const { simuladoId, questaoId } = req.params;
    const updateData: UpdateSimuladoQuestaoDTO = req.body as UpdateSimuladoQuestaoDTO;

    const { data: questao, error } = await supabase
      .from('simulado_questoes')
      .update(updateData)
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId)
      .select()
      .single() as { data: UpdateSimuladoQuestaoDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Questão não encontrada' });
      }
      logger.error('Erro ao atualizar questão', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/questoes/:questaoId', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * DELETE /api/simulados/:simuladoId/questoes/:questaoId - Remover questão
 */
export const deleteQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const { simuladoId, questaoId } = req.params;

    const { error } = await supabase
      .from('simulado_questoes')
      .delete()
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId);

    if (error) {
      logger.error('Erro ao remover questão', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, message: 'Questão removida com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:simuladoId/questoes/:questaoId', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * POST /api/simulados/:id/progresso - Iniciar progresso do usuário
 */
export const createProgressHandler = async (req: Request, res: Response) => {
  try {
    const { id: simuladoId } = req.params;

    // Validate request body
    const validationResult = createProgressSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }

    const progressData = {
      ...validationResult.data,
      simulado_id: simuladoId,
      data_inicio: validationResult.data.data_inicio ?? new Date().toISOString(),
    };

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .insert([progressData])
      .select()
      .single() as { data: UpdateusuariosimuladoProgressDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao criar progresso', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(201).json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/progresso', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * PUT /api/simulados/:simuladoId/progresso/:progressId - Atualizar progresso
 */
export const updateProgressHandler = async (req: Request, res: Response) => {
  try {
    const { simuladoId, progressId } = req.params;
    const updateData: UpdateusuariosimuladoProgressDTO = req.body as UpdateusuariosimuladoProgressDTO;

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .update(updateData)
      .eq('id', progressId)
      .eq('simulado_id', simuladoId)
      .select()
      .single() as { data: UpdateusuariosimuladoProgressDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Progresso não encontrado' });
      }
      logger.error('Erro ao atualizar progresso', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/progresso/:progressId', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * GET /api/simulados/:id/progresso - Buscar progresso do usuário
 */
export const getProgressHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: simuladoId } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .select('*')
      .eq('simulado_id', simuladoId)
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false }) as { data: UpdateusuariosimuladoProgressDTO[] | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao buscar progresso', { error: error.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota GET /simulados/:id/progresso', { error: 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar router Express
const router = express.Router();  

// Middleware de autenticação já é aplicado globalmente
// router.use(requireAuth);

// Registrar rotas principais
router.get('/', (req, res) => {
  getSimuladosHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladosHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.get('/:id', (req, res) => {
  getSimuladoByIdHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladoByIdHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.post('/', (req, res) => {
  createSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em createSimuladoHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.put('/:id', (req, res) => {
  updateSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em updateSimuladoHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.delete('/:id', (req, res) => {
  deleteSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em deleteSimuladoHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// Rotas de questões
router.post('/:id/questoes', addQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
router.put('/questoes/:questaoId', updateQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
router.delete('/questoes/:questaoId', deleteQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

// Rotas de progresso
router.post('/:id/progresso', createProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
router.put('/:simuladoId/progresso/:progressId', updateProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
router.get('/:id/progresso', getProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

export { router };