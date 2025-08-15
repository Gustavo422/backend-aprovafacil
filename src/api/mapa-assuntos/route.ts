import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { getConcursoIdFromRequest } from '../../middleware/global-concurso-filter.middleware.js';

const router = express.Router();  

// Tipos para o retorno do Supabase
interface MapaAssunto {
  id: string;
  usuario_id: string;
  assunto: string;
  disciplina: string;
  categoria_id?: string;
  concurso_id?: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'revisao';
  prioridade: 'baixa' | 'media' | 'alta';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  progresso_percentual: number;
  criado_em: string;
  atualizado_em: string;
  disciplinas_categoria?: {
    id: string;
    nome: string;
    descricao?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
  };
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano?: number;
    banca?: string;
  };
}

// Schemas de validação
const createMapaAssuntoSchema = z.object({
  usuario_id: z.string().uuid(),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(255),
  disciplina: z.string().min(1, 'Disciplina é obrigatória').max(100),
  categoria_id: z.string().uuid().optional(),
  concurso_id: z.string().uuid().optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'revisao']).default('pendente'),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  observacoes: z.string().optional(),
  progresso_percentual: z.number().min(0).max(100).default(0),
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
  progresso_percentual: z.number().min(0).max(100).optional(),
});

// Middleware de validação Express local
const createValidationMiddleware = (schema: z.ZodTypeAny, field: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body as unknown : field === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      if (field === 'body') {
        req.body = result.data as Record<string, unknown>;
      } else if (field === 'query') {
        req.query = result.data as Record<string, string | string[] | undefined>;
      } else {
        req.params = result.data as Record<string, string>;
      }
      next();
    } catch {
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR',
      });
    }
  };
};

// GET /api/mapa-assuntos - Listar mapa de assuntos do usuário
router.get('/', requireAuth, (req, res) => {
  (async () => {
    try {
    const usuarioId = req.user?.id;
    const { page = 1, limit = 10, status, disciplina, categoria_id } = req.query;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('mapa_assuntos')
      .select(`
        *,
        disciplinas_categoria (
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
      .eq('usuario_id', usuarioId);

    // Aplicar filtro por concurso, se disponível
    const concursoId = getConcursoIdFromRequest(req);
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${String(disciplina)}%`);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }
    // O filtro de concurso é aplicado automaticamente pelo middleware global
    // Já aplicado acima na query principal

    const { data: assuntos, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1) as { data: MapaAssunto[] | null; error: Error | null; count: number | null };

    if (error) {
      logger.error('Erro ao buscar mapa de assuntos', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count ?? 0) / Number(limit));

    res.json({
      success: true,
      data: assuntos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count ?? 0,
        totalPages,
      },
    });
    } catch (error) {
      logger.error('Erro na rota GET /mapa-assuntos', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota GET /mapa-assuntos', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// GET /api/mapa-assuntos/:id - Buscar assunto específico
router.get('/:id', requireAuth, (req, res) => {
  (async () => {
    try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId2 = getConcursoIdFromRequest(req);
    let byIdQuery = supabase
      .from('mapa_assuntos')
      .select(`
        *,
        disciplinas_categoria (
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
      .eq('usuario_id', usuarioId);
    if (concursoId2) byIdQuery = byIdQuery.eq('concurso_id', concursoId2);
    const { data: assunto, error } = await byIdQuery.single() as { data: MapaAssunto | null; error: Error | null };

    if (error) {
      if ((error as unknown as { code?: string }).code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao buscar assunto', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: assunto });
    } catch (error) {
      logger.error('Erro na rota GET /mapa-assuntos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota GET /mapa-assuntos/:id', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// POST /api/mapa-assuntos - Criar novo assunto
router.post('/', requireAuth, createValidationMiddleware(createMapaAssuntoSchema, 'body'), (req, res) => {
  (async () => {
    try {
    const usuarioId = req.user?.id;
    const assuntoData = { ...(req.body as Record<string, unknown>), usuario_id: usuarioId };

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: assunto, error } = await supabase
      .from('mapa_assuntos')
      .insert([assuntoData])
      .select()
      .single() as { data: MapaAssunto | null; error: Error | null };

    if (error) {
      logger.error('Erro ao criar assunto', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: assunto });
    } catch (error) {
      logger.error('Erro na rota POST /mapa-assuntos', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota POST /mapa-assuntos', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// PUT /api/mapa-assuntos/:id - Atualizar assunto
router.put('/:id', requireAuth, createValidationMiddleware(updateMapaAssuntoSchema, 'body'), (req, res) => {
  (async () => {
    try {
    const { id } = req.params;
    const usuarioId = req.user?.id;
    const updateData = req.body as Record<string, unknown>;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId3 = getConcursoIdFromRequest(req);
    let updateQuery = supabase
      .from('mapa_assuntos')
      .update(updateData)
      .eq('id', id)
      .eq('usuario_id', usuarioId);
    if (concursoId3) updateQuery = updateQuery.eq('concurso_id', concursoId3);
    const { data: assunto, error } = await updateQuery
      .select()
      .single() as { data: MapaAssunto | null; error: Error | null };

    if (error) {
      if ((error as unknown as { code?: string }).code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao atualizar assunto', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: assunto });
    } catch (error) {
      logger.error('Erro na rota PUT /mapa-assuntos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota PUT /mapa-assuntos/:id', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// DELETE /api/mapa-assuntos/:id - Deletar assunto
router.delete('/:id', requireAuth, (req, res) => {
  (async () => {
    try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const concursoId4 = getConcursoIdFromRequest(req);
    let delQuery = supabase
      .from('mapa_assuntos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', usuarioId);
    if (concursoId4) delQuery = delQuery.eq('concurso_id', concursoId4);
    const { error } = await delQuery;

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Assunto não encontrado' });
        return;
      }
      logger.error('Erro ao deletar assunto', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true });
    } catch (error) {
      logger.error('Erro na rota DELETE /mapa-assuntos/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota DELETE /mapa-assuntos/:id', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

// GET /api/mapa-assuntos/stats/resumo - Resumo estatístico
router.get('/stats/resumo', requireAuth, (req, res) => {
  (async () => {
    try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Buscar estatísticas por status
    const concursoId5 = getConcursoIdFromRequest(req);
    let statsQuery = supabase
      .from('mapa_assuntos')
      .select('status, progresso_percentual')
      .eq('usuario_id', usuarioId);
    if (concursoId5) statsQuery = statsQuery.eq('concurso_id', concursoId5);
    const { data: stats, error } = await statsQuery as { data: Pick<MapaAssunto, 'status' | 'progresso_percentual'>[] | null; error: Error | null };

    if (error) {
      logger.error('Erro ao buscar estatísticas', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Calcular estatísticas
    const total = stats ? stats.length : 0;
    const porStatus = {
      pendente: stats ? stats.filter(s => s.status === 'pendente').length : 0,
      em_andamento: stats ? stats.filter(s => s.status === 'em_andamento').length : 0,
      concluido: stats ? stats.filter(s => s.status === 'concluido').length : 0,
      revisao: stats ? stats.filter(s => s.status === 'revisao').length : 0,
    };

    const progressoMedio = stats && stats.length > 0 
      ? stats.reduce((acc, curr) => acc + (curr.progresso_percentual || 0), 0) / stats.length 
      : 0;

    res.json({
      success: true,
      data: {
        total,
        porStatus,
        progressoMedio: Math.round(progressoMedio * 100) / 100,
      },
    });
    } catch (error) {
      logger.error('Erro na rota GET /mapa-assuntos/stats/resumo', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })().catch((error) => {
    logger.error('Erro não tratado na rota GET /mapa-assuntos/stats/resumo', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

export { router };
