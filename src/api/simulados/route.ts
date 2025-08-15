import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { getConcursoIdFromRequest } from '../../middleware/global-concurso-filter.middleware.js';
import { rateLimit as rateLimitMiddleware } from '../../config/rateLimit.js';
import { createUserRateLimitMiddleware } from '../../middleware/user-rate-limit.middleware.js';
import { computeListEtag, computeQuestoesEtag, computeSimuladoDetailEtag } from './etag.js';
import { progressBySlugSchema, progressBySlugUpdateSchema } from './schemas.js';
import type {
  UpdateSimuladoDTO,
  SimuladoFiltersDTO,
  PaginatedSimuladosResponseDTO,
  SimuladoWithRelationsDTO,
  CreateSimuladoQuestaoDTO,
  UpdateSimuladoQuestaoDTO,
  UpdateusuariosimuladoProgressDTO,
} from '../../types/simulados.dto.js';
import { LogService } from '../../core/utils/log.service.js';
import { CacheManager } from '../../core/utils/cache-manager.js';
import cacheConfig from '../../config/cache.config.js';
import { SupabaseSimuladosRepository } from '../../modules/simulados/repositories/simulados.repository.js';
import { SimuladosService } from '../../modules/simulados/services/simulados.service.js';

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

// Instâncias do módulo (service/repository) para integração básica nos handlers v1
const simuladosRepo = new SupabaseSimuladosRepository(supabase);
const simuladosLog = new LogService(supabase, 'SIMULADOS');
const simuladosCacheManager = CacheManager.getInstance(cacheConfig.provider, simuladosLog, supabase);
const simuladosService = new SimuladosService(supabase, simuladosRepo, simuladosCacheManager.getCacheService(), simuladosLog);

// Schemas de validação
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  dificuldade: z.string().optional(),
  concurso_id: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.enum(['finalizado', 'em_andamento', 'nao_iniciado']).optional(),
});
// Aceitar nomes antigos como opcionais, mas padronizar snake_case do DB
const createSimuladoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  tempo_minutos: z.number().min(1, 'tempo_minutos deve ser maior que 0').optional(),
  numero_questoes: z.number().min(1, 'numero_questoes deve ser maior que 0').optional(),
  publico: z.boolean().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
  // legacy (deprecated)
  tempo_duracao_minutos: z.number().min(1).optional(),
  total_questoes: z.number().min(1).optional(),
  is_public: z.boolean().optional(),
}).refine((val) => (val.tempo_minutos ?? val.tempo_duracao_minutos) !== undefined, { message: 'tempo_minutos é obrigatório', path: ['tempo_minutos'] })
  .refine((val) => (val.numero_questoes ?? val.total_questoes) !== undefined, { message: 'numero_questoes é obrigatório', path: ['numero_questoes'] });

const updateSimuladoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  tempo_minutos: z.number().min(1).optional(),
  numero_questoes: z.number().min(1).optional(),
  publico: z.boolean().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
  // legacy (deprecated)
  tempo_duracao_minutos: z.number().min(1).optional(),
  total_questoes: z.number().min(1).optional(),
  is_public: z.boolean().optional(),
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
    const start = Date.now();
    logger.debug('getSimuladosHandler - Iniciando', {
      user: req.user,
      concursoId: req.concursoId,
      hasAuth: req.headers.authorization ? 'presente' : 'ausente',
    });
    
    // Validação/coerção de query params
    const { page, limit, dificuldade, status, search } = listQuerySchema.parse(req.query);

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

    // Filtro de concurso
    const concursoId = getConcursoIdFromRequest(req);
    if (!concursoId) {
      logger.warn('Nenhum concurso configurado para o usuário');
      return res.status(400).json({ success: false, error: 'Concurso não configurado. Selecione um concurso primeiro.', code: 'CONCURSO_NOT_CONFIGURED' });
    }

    // Delegar para o serviço (com cache e agregações disponíveis)
    const pageData = await simuladosService.listarSimulados({
      page: Number(page),
      limit: Number(limit),
      concurso_id: concursoId,
      dificuldade: dificuldade ?? undefined,
      search: search ?? undefined,
      status: status ?? undefined,
    }, req.user?.id);

    const simuladosData = pageData.items as unknown as SimuladoWithRelationsDTO[];
    const countData = pageData.total;
    const totalPages = Math.ceil((countData ?? 0) / Number(limit));
    const response: PaginatedSimuladosResponseDTO = { success: true, data: simuladosData ?? [], pagination: { page: Number(page), limit: Number(limit), total: countData ?? 0, totalPages } };

    // Headers v1: ETag/Last-Modified e duração
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      res.setHeader('x-feature', 'simulados');
      const maxUpdated = (simuladosData ?? [])
        .map((s) => (s as any)?.atualizado_em as string | undefined)
        .filter(Boolean)
        .sort()
        .pop();
      if (maxUpdated) {
        res.setHeader('Last-Modified', new Date(maxUpdated).toUTCString());
      }
      const etag = computeListEtag({
        concursoId,
        page,
        limit,
        dificuldade: dificuldade ?? undefined,
        search: search ?? undefined,
        status: status ?? undefined,
        lastUpdated: maxUpdated ?? undefined,
      });
      const ifNoneMatch = req.get('if-none-match');
      const ifModifiedSince = req.get('if-modified-since');
      if (ifNoneMatch === etag || (ifModifiedSince && maxUpdated && new Date(ifModifiedSince).getTime() >= new Date(maxUpdated).getTime())) {
        res.setHeader('ETag', etag);
        if (maxUpdated) res.setHeader('Last-Modified', new Date(maxUpdated).toUTCString());
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        return res.status(304).end();
      }
      res.setHeader('ETag', etag);
      res.setHeader('X-Server-Duration', String(Date.now() - start));
    }

    // Log estruturado com correlação
    const correlationId = req.get('x-correlation-id') ?? undefined;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json(response);
  } catch {
    logger.error('Erro na rota GET /simulados', { error: 'Erro desconhecido' });
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      res.setHeader('x-feature', 'simulados');
    }
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
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
        id, titulo, descricao, slug, concurso_id, categoria_id, numero_questoes, tempo_minutos, dificuldade, disciplinas, publico, ativo, criado_por, criado_em, atualizado_em,
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
        questoes_simulado (
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
        return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
      }
      logger.error('Erro ao buscar simulado', { error: error.message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    return res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota GET /simulados/:id', { error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/v1/simulados/slug/:slug - Buscar simulado por SLUG (v1 preferencial)
 */
export const getSimuladoBySlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = Date.now();
    const { slug } = req.params as { slug: string };
    const concursoId = getConcursoIdFromRequest(req);
    const simulado = await simuladosService.buscarDetalhePorSlug(slug, req.user?.id, concursoId ?? undefined);

    // ETag e Last-Modified para v1
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      const metaRev = (simulado as any)?.meta_revision ?? 0;
      const qRev = (simulado as any)?.questoes_revision ?? 0;
      const etag = computeSimuladoDetailEtag(metaRev, qRev);
      const lastMod = (simulado as any)?.atualizado_em ?? null;
      const ifNoneMatch = req.get('if-none-match');
      const ifModifiedSince = req.get('if-modified-since');
      if (ifNoneMatch === etag || (ifModifiedSince && lastMod && new Date(ifModifiedSince).getTime() >= new Date(lastMod).getTime())) {
        res.setHeader('ETag', etag);
        if (lastMod) res.setHeader('Last-Modified', new Date(lastMod).toUTCString());
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.setHeader('x-feature', 'simulados');
        return res.status(304).end();
      }
      res.setHeader('ETag', etag);
      if (lastMod) res.setHeader('Last-Modified', new Date(lastMod).toUTCString());
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      res.setHeader('x-feature', 'simulados');
    }

    const correlationId = req.get('x-correlation-id') ?? undefined;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-feature', 'simulados');
    return res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota GET /simulados/slug/:slug', { error: 'Erro desconhecido' });
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      res.setHeader('x-feature', 'simulados');
    }
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/v1/simulados/slug/:slug/questoes - Listar questões do simulado por slug
 */
export const getQuestoesBySimuladoSlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = Date.now();
    const { slug } = req.params as { slug: string };
    const concursoId = getConcursoIdFromRequest(req);
    const afterParam = req.query?.after as string | undefined;
    const limitParam = req.query?.limit as string | undefined;
    const afterOrdem = afterParam ? Number(afterParam) : undefined;
    const qLimit = limitParam ? Math.min(200, Math.max(1, Number(limitParam))) : undefined;
    const simuladoId = await simuladosRepo.buscarIdPorSlug(slug, concursoId ?? undefined);
    if (!simuladoId) return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
    // Cursor pagination opcional (por ordem)
    const useCursor = typeof afterOrdem === 'number' || typeof qLimit === 'number';
    const questoes = useCursor
      ? (await simuladosRepo.listarQuestoesPorSimuladoIdPaginado(simuladoId, afterOrdem, qLimit)).items
      : await simuladosService.listarQuestoesPorSimuladoId(simuladoId);

    // ETag específico das questões
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      const { data: parentMeta } = await supabase
        .from('simulados')
        .select('questoes_revision, questoes_atualizado_em')
        .eq('id', simuladoId)
        .single();
      const qRev = (parentMeta as any)?.questoes_revision ?? 0;
      const lastQ = (parentMeta as any)?.questoes_atualizado_em ?? null;
      const etag = computeQuestoesEtag(qRev);
      const ifNoneMatch = req.get('if-none-match');
      const ifModifiedSince = req.get('if-modified-since');
      if (ifNoneMatch === etag || (ifModifiedSince && lastQ && new Date(ifModifiedSince).getTime() >= new Date(lastQ).getTime())) {
        res.setHeader('ETag', etag);
        if (lastQ) res.setHeader('Last-Modified', new Date(lastQ).toUTCString());
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.setHeader('x-feature', 'simulados');
        return res.status(304).end();
      }
      res.setHeader('ETag', etag);
      if (lastQ) res.setHeader('Last-Modified', new Date(lastQ).toUTCString());
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      res.setHeader('x-feature', 'simulados');
    }

    const correlationId = req.get('x-correlation-id') ?? undefined;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    if (useCursor) {
      const { nextCursor } = await simuladosRepo.listarQuestoesPorSimuladoIdPaginado(simuladoId, afterOrdem, qLimit);
      return res.json({ success: true, data: questoes ?? [], pagination: { nextCursor: nextCursor ?? null, limit: qLimit ?? null } });
    }
    return res.json({ success: true, data: questoes ?? [] });
  } catch {
    logger.error('Erro na rota GET /simulados/slug/:slug/questoes', { error: 'Erro desconhecido' });
    const reqUrl = (req as Request).originalUrl ?? '';
    if (reqUrl.startsWith('/api/v1/')) {
      res.setHeader('x-feature', 'simulados');
    }
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * POST /api/v1/simulados/slug/:slug/submit - Registrar submissão/progresso por slug (compat com payload simplificado)
 */
export const submitSimuladoBySlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHORIZED' });
    }

    const concursoId = getConcursoIdFromRequest(req);
    let simIdQuery = supabase
      .from('simulados')
      .select('id')
      .eq('slug', slug);
    if (concursoId) simIdQuery = simIdQuery.eq('concurso_id', concursoId);
    const { data: simuladoIdData, error: simError } = await simIdQuery.single() as unknown as { data: { id: string } | null; error: { message: string; code?: string } | null };

    if (simError || !simuladoIdData) {
      if (simError?.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
      }
      logger.error('Erro ao buscar simulado por slug (submit)', { error: simError?.message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    const simuladoId = simuladoIdData.id;

    let body: unknown;
    try {
      body = req.body;
    } catch {
      body = {};
    }

    // Suportar payload simplificado: { answers, score, timeTaken }
    const simplified = body as { answers?: Record<string, unknown>; score?: number; timeTaken?: number };
    const progressPayload: Partial<UpdateusuariosimuladoProgressDTO> = {
      usuario_id: usuarioId,
      simulado_id: simuladoId,
      respostas: (simplified?.answers as unknown) as Record<string, unknown>,
      pontuacao: simplified?.score ?? 0,
      tempo_gasto_minutos: simplified?.timeTaken ?? 0,
      is_concluido: true,
      concluido_em: new Date().toISOString() as unknown as never,
    } as unknown as UpdateusuariosimuladoProgressDTO;

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .insert([progressPayload])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao registrar submit de simulado por slug', { error: (error as { message: string }).message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    // Upsert de status declarativo por usuário/simulado
    await supabase
      .from('usuario_simulado_status')
      .upsert({
        usuario_id: usuarioId,
        simulado_id: simuladoId,
        status: 'finalizado',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id,simulado_id' });

    return res.status(201).json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota POST /simulados/slug/:slug/submit', { error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

// POST /api/v1/simulados/:slug/progresso - registra progresso do usuário atual
export const postProgressBySlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = Date.now();
    const { slug } = req.params as { slug: string };
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHORIZED' });

    const concursoId = getConcursoIdFromRequest(req);
    let simRowQuery = supabase
      .from('simulados')
      .select('id')
      .eq('slug', slug);
    if (concursoId) simRowQuery = simRowQuery.eq('concurso_id', concursoId);
    const { data: simuladoRow, error: simErr } = await simRowQuery.single();
    if (simErr || !simuladoRow) return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });

    // Validar e normalizar body
    const parse = progressBySlugSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: parse.error.flatten() });
    }
    const normalized = parse.data as unknown as Record<string, unknown>;
    const payload = {
      usuario_id: usuarioId,
      simulado_id: (simuladoRow as any).id as string,
      respostas: (normalized['respostas'] as Record<string, unknown>) ?? {},
      pontuacao: (normalized['pontuacao'] as number) ?? 0,
      tempo_gasto_minutos: (normalized['tempo_gasto_minutos'] as number) ?? 0,
      is_concluido: (normalized['is_concluido'] as boolean) ?? true,
      concluido_em: (normalized['concluido_em'] as string) ?? new Date().toISOString(),
    } as Record<string, unknown>;

    const { data, error } = await supabase
      .from('progresso_usuario_simulado')
      .insert([payload])
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    // Se marcou como concluído, refletir no status declarativo
    if ((payload as any).is_concluido === true) {
      await supabase
        .from('usuario_simulado_status')
        .upsert({
          usuario_id: usuarioId,
          simulado_id: (simuladoRow as any).id,
          status: 'finalizado',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'usuario_id,simulado_id' });
    } else {
      await supabase
        .from('usuario_simulado_status')
        .upsert({
          usuario_id: usuarioId,
          simulado_id: (simuladoRow as any).id,
          status: 'em_andamento',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'usuario_id,simulado_id' });
    }
    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.status(201).json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

// PUT /api/v1/simulados/:slug/progresso - atualiza o último progresso do usuário atual
export const putProgressBySlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = Date.now();
    const { slug } = req.params as { slug: string };
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHORIZED' });

    const concursoId = getConcursoIdFromRequest(req);
    let simRowQuery = supabase
      .from('simulados')
      .select('id')
      .eq('slug', slug);
    if (concursoId) simRowQuery = simRowQuery.eq('concurso_id', concursoId);
    const { data: simuladoRow, error: simErr } = await simRowQuery.single();
    if (simErr || !simuladoRow) return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
    const simuladoId = (simuladoRow as any).id as string;

    const { data: latest, error: latestErr } = await supabase
      .from('progresso_usuario_simulado')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('simulado_id', simuladoId)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single();
    if (latestErr || !latest) return res.status(404).json({ success: false, error: 'Progresso não encontrado', code: 'PROGRESS_NOT_FOUND' });

    const parse = progressBySlugUpdateSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Dados inválidos', code: 'VALIDATION_ERROR', details: parse.error.flatten() });
    }
    const normalized = parse.data as unknown as Record<string, unknown>;
    const update = {
      respostas: normalized['respostas'],
      pontuacao: normalized['pontuacao'],
      tempo_gasto_minutos: normalized['tempo_gasto_minutos'],
      is_concluido: normalized['is_concluido'],
      concluido_em: normalized['concluido_em'] ?? (normalized['is_concluido'] ? new Date().toISOString() : null),
    } as Record<string, unknown>;

    const { data, error } = await supabase
      .from('progresso_usuario_simulado')
      .update(update)
      .eq('id', (latest as any).id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    // Refletir mudança no status declarativo
    const concluded = (update as any).is_concluido === true || (update as any).concluido_em != null;
    await supabase
      .from('usuario_simulado_status')
      .upsert({
        usuario_id: usuarioId,
        simulado_id: simuladoId,
        status: concluded ? 'finalizado' : 'em_andamento',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id,simulado_id' });
    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/v1/simulados/slug/:slug/progresso - Buscar progresso do usuário atual por slug
 */
export const getProgressBySlugHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHORIZED' });
    }

    const concursoId = getConcursoIdFromRequest(req);
    let simIdQuery = supabase
      .from('simulados')
      .select('id')
      .eq('slug', slug);
    if (concursoId) simIdQuery = simIdQuery.eq('concurso_id', concursoId);
    const { data: simuladoIdData, error: simError } = await simIdQuery.single() as unknown as { data: { id: string } | null; error: { message: string; code?: string } | null };

    if (simError || !simuladoIdData) {
      if (simError?.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
      }
      logger.error('Erro ao buscar simulado por slug (progresso)', { error: simError?.message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    const simuladoId = simuladoIdData.id;

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .select('id, usuario_id, simulado_id, tempo_gasto_minutos, respostas, pontuacao, is_concluido, concluido_em')
      .eq('simulado_id', simuladoId)
      .eq('usuario_id', usuarioId)
      .order('concluido_em', { ascending: false });

    if (error) {
      logger.error('Erro ao buscar progresso por slug', { error: (error as { message: string }).message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    return res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota GET /simulados/slug/:slug/progresso', { error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * POST /api/simulados - Criar novo simulado
 */
export const createSimuladoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
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

    // Mapear campos legados para o novo contrato
    const simuladoData = {
      ...validationResult.data,
      tempo_minutos: validationResult.data.tempo_minutos ?? validationResult.data.tempo_duracao_minutos,
      numero_questoes: validationResult.data.numero_questoes ?? validationResult.data.total_questoes,
      publico: validationResult.data.publico ?? validationResult.data.is_public,
    } as Record<string, unknown>;

    const { data: simulado, error } = await supabase
      .from('simulados')
      .insert([simuladoData])
      .select()
      .single() as { data: SimuladoWithRelationsDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao criar simulado', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.status(201).json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota POST /simulados', { feature: 'simulados', error: 'Erro desconhecido' });
    res.setHeader('x-feature', 'simulados');
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * PUT /api/simulados/:id - Atualizar simulado
 */
export const updateSimuladoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
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

    const updateData: UpdateSimuladoDTO = {
      ...validationResult.data,
      tempo_minutos: validationResult.data.tempo_minutos ?? validationResult.data.tempo_duracao_minutos,
      numero_questoes: validationResult.data.numero_questoes ?? validationResult.data.total_questoes,
      publico: (validationResult.data as Record<string, unknown>)['publico'] as boolean | undefined ?? validationResult.data.is_public,
    };

    const { data: simulado, error } = await supabase
      .from('simulados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as { data: SimuladoWithRelationsDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        res.setHeader('x-feature', 'simulados');
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        return res.status(404).json({ success: false, error: 'Simulado não encontrado', code: 'SIMULADO_NOT_FOUND' });
      }
      logger.error('Erro ao atualizar simulado', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, data: simulado });
  } catch {
    logger.error('Erro na rota PUT /simulados/:id', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * DELETE /api/simulados/:id - Deletar simulado
 */
export const deleteSimuladoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const { id } = req.params;

    const { error } = await supabase
      .from('simulados')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar simulado', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, message: 'Simulado deletado com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:id', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * POST /api/simulados/:id/questoes - Adicionar questão ao simulado
 */
export const addQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
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
      .from('questoes_simulado')
      .insert([questaoData])
      .select()
      .single() as { data: CreateSimuladoQuestaoDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao adicionar questão', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.status(201).json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/questoes', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * PUT /api/simulados/:simuladoId/questoes/:questaoId - Atualizar questão
 */
export const updateQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const { simuladoId, questaoId } = req.params;
    const updateData: UpdateSimuladoQuestaoDTO = req.body as UpdateSimuladoQuestaoDTO;

    const { data: questao, error } = await supabase
      .from('questoes_simulado')
      .update(updateData)
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId)
      .select()
      .single() as { data: UpdateSimuladoQuestaoDTO | null; error: { message: string; code?: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        res.setHeader('x-feature', 'simulados');
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        return res.status(404).json({ success: false, error: 'Questão não encontrada', code: 'QUESTAO_NOT_FOUND' });
      }
      logger.error('Erro ao atualizar questão', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/questoes/:questaoId', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * DELETE /api/simulados/:simuladoId/questoes/:questaoId - Remover questão
 */
export const deleteQuestaoHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const { simuladoId, questaoId } = req.params;

    const { error } = await supabase
      .from('questoes_simulado')
      .delete()
      .eq('id', questaoId)
      .eq('simulado_id', simuladoId);

    if (error) {
      logger.error('Erro ao remover questão', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, message: 'Questão removida com sucesso' });
  } catch {
    logger.error('Erro na rota DELETE /simulados/:simuladoId/questoes/:questaoId', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * POST /api/simulados/:id/progresso - Iniciar progresso do usuário
 */
export const createProgressHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
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
      logger.error('Erro ao criar progresso', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.status(201).json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota POST /simulados/:id/progresso', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * PUT /api/simulados/:simuladoId/progresso/:progressId - Atualizar progresso
 */
export const updateProgressHandler = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
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
        res.setHeader('x-feature', 'simulados');
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        return res.status(404).json({ success: false, error: 'Progresso não encontrado', code: 'PROGRESS_NOT_FOUND' });
      }
      logger.error('Erro ao atualizar progresso', { feature: 'simulados', error: error.message });
      res.setHeader('x-feature', 'simulados');
      res.setHeader('X-Server-Duration', String(Date.now() - start));
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota PUT /simulados/:simuladoId/progresso/:progressId', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/simulados/:id/progresso - Buscar progresso do usuário
 */
export const getProgressHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const start = Date.now();
    const { id: simuladoId } = req.params;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado', code: 'UNAUTHORIZED' });
    }

    const { data: progress, error } = await supabase
      .from('progresso_usuario_simulado')
      .select('id, usuario_id, simulado_id, tempo_gasto_minutos, respostas, pontuacao, is_concluido, criado_em, atualizado_em, concluido_em')
      .eq('simulado_id', simuladoId)
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false }) as { data: UpdateusuariosimuladoProgressDTO[] | null; error: { message: string; code?: string } | null };

    if (error) {
      logger.error('Erro ao buscar progresso', { feature: 'simulados', error: error.message });
      return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }

    res.setHeader('x-feature', 'simulados');
    res.setHeader('X-Server-Duration', String(Date.now() - start));
    return res.json({ success: true, data: progress });
  } catch {
    logger.error('Erro na rota GET /simulados/:id/progresso', { feature: 'simulados', error: 'Erro desconhecido' });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  }
};

// Routers Express separados para legado e v1
const legacyRouter = express.Router();  

// Middleware de autenticação já é aplicado globalmente
// router.use(requireAuth);

// Registrar rotas principais
legacyRouter.get('/', (req, res) => {
  getSimuladosHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladosHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
// Rota preferencial por SLUG (v1). Evita conflito com ID ao usar um prefixo explícito
legacyRouter.get('/slug/:slug', (req, res) => {
  getSimuladoBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladoBySlugHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.get('/slug/:slug/questoes', (req, res) => {
  getQuestoesBySimuladoSlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getQuestoesBySimuladoSlugHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.post('/slug/:slug/submit', (req, res) => {
  submitSimuladoBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em submitSimuladoBySlugHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.get('/slug/:slug/progresso', (req, res) => {
  getProgressBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getProgressBySlugHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.get('/:id', (req, res) => {
  getSimuladoByIdHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladoByIdHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.post('/', (req, res) => {
  createSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em createSimuladoHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.put('/:id', (req, res) => {
  updateSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em updateSimuladoHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
legacyRouter.delete('/:id', (req, res) => {
  deleteSimuladoHandler(req, res).catch((error) => {
    logger.error('Erro não tratado em deleteSimuladoHandler', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});

// Rotas de questões
legacyRouter.post('/:id/questoes', addQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
legacyRouter.put('/questoes/:questaoId', updateQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
legacyRouter.delete('/questoes/:questaoId', deleteQuestaoHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

// Rotas de progresso
legacyRouter.post('/:id/progresso', createProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
legacyRouter.put('/:simuladoId/progresso/:progressId', updateProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises
legacyRouter.get('/:id/progresso', getProgressHandler); // eslint-disable-line @typescript-eslint/no-misused-promises

// v1 router: slug-only
const v1Router = express.Router();

// Rate limit específico para o módulo simulados v1 (IP + usuário)
v1Router.use(rateLimitMiddleware);
v1Router.use(createUserRateLimitMiddleware({ windowMs: 60_000, max: 90 }));

// Bloquear acesso por ID (UUID) na v1 para evitar ambiguidade com slug
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
v1Router.use('/:slug', (req: Request, res: Response, next: NextFunction): void => {
  const slug = (req.params as { slug?: string }).slug;
  if (slug && UUID_REGEX.test(slug)) {
    res.status(400).json({ success: false, error: 'Acesso por ID não permitido na v1. Use slug.', code: 'ID_NOT_ALLOWED' });
    return;
  }
  next();
});
v1Router.get('/', (req, res) => {
  getSimuladosHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladosHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
v1Router.get('/:slug', (req, res) => {
  getSimuladoBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getSimuladoBySlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
v1Router.get('/:slug/questoes', (req, res) => {
  getQuestoesBySimuladoSlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getQuestoesBySimuladoSlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
v1Router.get('/:slug/progresso', (req, res) => {
  getProgressBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getProgressBySlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
v1Router.post('/:slug/progresso', (req, res) => {
  postProgressBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em postProgressBySlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});
v1Router.put('/:slug/progresso', (req, res) => {
  putProgressBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em putProgressBySlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});

// v1 submit por slug (alinha com rota legada /slug/:slug/submit)
v1Router.post('/:slug/submit', (req, res) => {
  submitSimuladoBySlugHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em submitSimuladoBySlugHandler (v1)', { error });
    res.status(500).json({ success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
  });
});

// Bloquear acesso por ID em v1 para evitar ambiguidade (slug-only)
v1Router.get('/:id([0-9a-fA-F-]{36})', (_req, res) => {
  res.status(400).json({ success: false, error: 'Acesso por ID não permitido na v1. Use slug.', code: 'ID_NOT_ALLOWED' });
});


export { legacyRouter as router, v1Router };