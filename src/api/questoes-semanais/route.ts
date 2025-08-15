import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { getConcursoIdFromRequest } from '../../middleware/global-concurso-filter.middleware.js';
import { requireAuth } from '../../middleware/auth.js';
import { CacheManager } from '../../core/utils/cache-manager.js';
import cacheConfig from '../../config/cache.config.js';
import LogService from '../../core/utils/log.service.js';
import { createQuestoesSemanaisController } from '../../modules/questoes-semanais/controllers/questoes-semanais.controller.js';
import { 
  validateQuery, 
  validateParams, 
  validateBody,
  sanitizeInput,
  createRateLimitMiddleware 
} from '../../modules/questoes-semanais/middleware/validation.middleware.js';
import { 
  historicoQuerySchema, 
  numeroSemanaPathSchema, 
  concluirSemanaBodySchema,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes 
} from '../../modules/questoes-semanais/validators/questoes-semanais.validator.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Tipos para o retorno do Supabase
interface QuestaoSemanal {
  id: string;
  titulo: string;
  enunciado: string;
  disciplina: string;
  dificuldade: 'facil' | 'medio' | 'dificil';
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano?: number;
    banca?: string;
  };
}

// Validation schemas para a rota antiga (compatibilidade)
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  ativo: z.string().optional().transform(val => val === 'true'),
  disciplina: z.string().optional(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  categoria_id: z.string().uuid().optional(),
});

/**
 * GET /api/questoes-semanais - Listar questões semanais (rota antiga - compatibilidade)
 * @deprecated Use /api/questoes-semanais/atual instead
 */
export const listQuestoesSemanalHandler = async (req: AuthenticatedRequest, res: Response) => {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const requestId = req.get('x-request-id') ?? undefined;
  const start = Date.now();
  
  // DEPRECATION WARNING - Log e header para observabilidade
  logger.warn('DEPRECATED: Rota antiga /api/questoes-semanais acessada', {
    userId: req.user?.id,
    concursoId: getConcursoIdFromRequest(req),
    correlationId,
    requestId,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    deprecatedRoute: '/api/questoes-semanais',
    recommendedRoute: '/api/questoes-semanais/atual'
  });

  // Adicionar headers de deprecação
  res.setHeader('x-deprecated', 'true');
  res.setHeader('x-deprecated-since', '2024-01-01');
  res.setHeader('x-recommended-route', '/api/questoes-semanais/atual');
  res.setHeader('x-sunset-date', '2024-06-01');
  
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Parâmetros de consulta inválidos',
        { details: validationResult.error.format() },
        correlationId,
        requestId
      );
      return res.status(400).json(response);
    }

    const { page = 1, limit = 10, ativo, disciplina, dificuldade } = validationResult.data;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `, { count: 'exact' });

    // Aplicar filtro de concurso explicitamente
    const concursoId = getConcursoIdFromRequest(req);
    if (!concursoId) {
      const response = createErrorResponse(
        ErrorCodes.CONCURSO_REQUIRED,
        'Concurso não configurado',
        undefined,
        correlationId,
        requestId
      );
      return res.status(422).json(response);
    }
    query = query.eq('concurso_id', concursoId);
    
    // Aplicar filtros adicionais
    if (typeof ativo === 'boolean') {
      query = query.eq('ativo', ativo);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }
    if (dificuldade) {
      query = query.eq('dificuldade', dificuldade);
    }

    const { data: questoes, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1) as { data: QuestaoSemanal[] | null; error: Error | null; count: number | null };

    if (error) {
      logger.error('Erro ao buscar questões semanais', { error: error.message, concursoId });
      const response = createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Erro interno do servidor',
        undefined,
        correlationId,
        requestId
      );
      return res.status(500).json(response);
    }

    const duration = Date.now() - start;
    const response = createSuccessResponse(questoes || [], undefined, correlationId, duration);
    
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    if (requestId) res.setHeader('x-request-id', requestId);
    res.setHeader('x-feature', 'questoes-semanais');
    res.setHeader('x-deprecated', 'true');
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Erro na rota GET /questoes-semanais', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    const response = createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Erro interno do servidor',
      undefined,
      correlationId,
      requestId
    );
    return res.status(500).json(response);
  }
};

/**
 * GET /api/questoes-semanais/:id - Buscar questão específica (rota antiga - compatibilidade)
 * @deprecated Use /api/questoes-semanais/atual instead
 */
export const getQuestaoSemanalByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const requestId = req.get('x-request-id') ?? undefined;
  const start = Date.now();
  
  // DEPRECATION WARNING - Log e header para observabilidade
  logger.warn('DEPRECATED: Rota antiga /api/questoes-semanais/:id acessada', {
    userId: req.user?.id,
    concursoId: getConcursoIdFromRequest(req),
    questionId: req.params.id,
    correlationId,
    requestId,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    deprecatedRoute: '/api/questoes-semanais/:id',
    recommendedRoute: '/api/questoes-semanais/atual'
  });

  // Adicionar headers de deprecação
  res.setHeader('x-deprecated', 'true');
  res.setHeader('x-deprecated-since', '2024-01-01');
  res.setHeader('x-recommended-route', '/api/questoes-semanais/atual');
  res.setHeader('x-sunset-date', '2024-06-01');
  
  try {
    const { id } = req.params;
    const concursoId = getConcursoIdFromRequest(req);
    if (!concursoId) {
      const response = createErrorResponse(
        ErrorCodes.CONCURSO_REQUIRED,
        'Concurso não configurado',
        undefined,
        correlationId,
        requestId
      );
      return res.status(422).json(response);
    }
    
    const { data: questao, error } = await supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .eq('id', id)
      .eq('concurso_id', concursoId)
      .single() as { data: QuestaoSemanal | null; error: Error | null };

    if (error) {
      logger.error('Erro ao buscar questão semanal', { error: error.message, id });
      const response = createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Erro interno do servidor',
        undefined,
        correlationId,
        requestId
      );
      return res.status(500).json(response);
    }

    if (!questao) {
      const response = createErrorResponse(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Questão semanal não encontrada',
        undefined,
        correlationId,
        requestId
      );
      return res.status(404).json(response);
    }

    const duration = Date.now() - start;
    const response = createSuccessResponse(questao, undefined, correlationId, duration);
    
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    if (requestId) res.setHeader('x-request-id', requestId);
    res.setHeader('x-feature', 'questoes-semanais');
    res.setHeader('x-deprecated', 'true');
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Erro na rota GET /questoes-semanais/:id', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    const response = createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Erro interno do servidor',
      undefined,
      correlationId,
      requestId
    );
    return res.status(500).json(response);
  }
};

// Criar router Express
const router = express.Router();  

// Aplicar middleware de autenticação em todas as rotas
router.use(requireAuth);

// Aplicar middleware de sanitização e rate limiting
router.use(sanitizeInput);
router.use(createRateLimitMiddleware(100, 15 * 60 * 1000)); // 100 requests por 15 minutos

// Instâncias do módulo (service/repository) para integração nos handlers dedicados
const qsLog = new LogService(supabase, 'QUESTOES_SEMANAIS');
const qsCacheManager = CacheManager.getInstance(cacheConfig.provider, qsLog, supabase);
const qsCache = qsCacheManager.getCacheService();
const qsController = createQuestoesSemanaisController({ supabase, cache: qsCache, log: qsLog });

// Endpoints dedicados com validação Zod (DEVEM VIR ANTES das rotas genéricas)
router.get('/atual', (req, res) => { void qsController.getAtual(req, res); });
router.get('/historico', validateQuery(historicoQuerySchema), (req, res) => { void qsController.getHistorico(req, res); });
router.get('/roadmap', (req, res) => { void qsController.getRoadmap(req, res); });

// Endpoint de conclusão com validação completa
router.post('/:numero_semana/concluir', 
  validateParams(numeroSemanaPathSchema),
  validateBody(concluirSemanaBodySchema),
  (req, res) => { void qsController.postConcluir(req, res); }
);

// Rotas antigas (compatibilidade) - usar handlers antigos (DEVEM VIR DEPOIS)
router.get('/', listQuestoesSemanalHandler);
router.get('/:id', getQuestaoSemanalByIdHandler);

export { router };
