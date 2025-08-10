import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';
import { AlunoDashboardRepository } from '../repositories/dashboard.repository.js';
import { GuruDashboardService } from '../services/dashboard.service.js';
import { AppError } from '../../../core/errors/index.js';
import CacheManager from '../../../core/utils/cache-manager.js';
import { CacheDependencyType } from '../../../core/utils/cache-invalidation.strategy.js';
import { LogService } from '../../../core/utils/log.service.js';

const activitiesQuerySchema = z.object({
  limit: z
    .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).max(50))
    .optional()
    .default(10),
});

export async function getEnhancedStats(req: Request, res: Response): Promise<void> {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const startTime = Date.now();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new AppError('Usuário não autenticado', 401, { code: 'UNAUTHORIZED' });
    }

    const repo = new AlunoDashboardRepository(supabase);
    const service = new GuruDashboardService(repo);

    // Cache por usuário e concurso (quando disponível)
    const concursoId = (req as any).concursoId as string | undefined;
    const cacheKey = `guru:enhanced-stats:user:${usuarioId}${concursoId ? `:concurso:${concursoId}` : ''}`;
    const logService = new LogService(supabase, 'GURU');
    const cacheManager = CacheManager.getInstance(undefined as any, logService, supabase);

    // Métrica de hit/miss simples: verificar existência antes do getOrSet
    const preCached = await cacheManager.get<unknown>(cacheKey);
    const stats = await cacheManager.getOrSet(
      cacheKey,
      async () => service.getEnhancedStats(usuarioId),
      {
        // Estratégia de TTL: 5 minutos para agregados do dashboard
        ttl: 5, // minutos
        dependencies: [
          { type: CacheDependencyType.USER, id: usuarioId },
          ...(concursoId ? [{ type: CacheDependencyType.CONCURSO, id: concursoId }] : []),
        ],
      },
    );

    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const durationMs = Date.now() - startTime;
    // Métricas básicas: tempo de resposta e anotação de cache (hit/miss)
    const cacheHit = preCached != null;
    res.setHeader('x-cache-hit', cacheHit ? '1' : '0');
    res.setHeader('x-duration-ms', String(durationMs));
    logger.info('Guru enhanced-stats sucesso', { feature: 'guru', requestId, correlationId, usuarioId, concursoId, cacheKey, durationMs, cacheHit });
    // Registrar métrica de performance
    await logService.logarPerformance('guru.enhanced-stats', durationMs, { cacheHit, usuarioId, concursoId });
    res.json({ success: true, data: stats });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    logger.error('Erro ao obter enhanced stats (guru)', { feature: 'guru', requestId, message, code, correlationId, durationMs });
    res.status(status).json({ success: false, error: message, code, requestId, correlationId });
  }
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const startTime = Date.now();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new AppError('Usuário não autenticado', 401, { code: 'UNAUTHORIZED' });
    }

    const parsed = activitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Parâmetros inválidos', 400, { code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }

    const { limit } = parsed.data;

    const repo = new AlunoDashboardRepository(supabase);
    const service = new GuruDashboardService(repo);

    // Cache por usuário, concurso e limite
    const concursoId = (req as any).concursoId as string | undefined;
    const cacheKey = `guru:activities:user:${usuarioId}${concursoId ? `:concurso:${concursoId}` : ''}:limit:${limit}`;
    const logService = new LogService(supabase, 'GURU');
    const cacheManager = CacheManager.getInstance(undefined as any, logService, supabase);

    const preCached = await cacheManager.get<unknown>(cacheKey);
    const activities = await cacheManager.getOrSet(
      cacheKey,
      async () => service.getActivities(usuarioId, { limit }),
      {
        // Estratégia de TTL: atividades podem mudar mais rápido
        ttl: 2, // minutos
        dependencies: [
          { type: CacheDependencyType.USER, id: usuarioId },
          ...(concursoId ? [{ type: CacheDependencyType.CONCURSO, id: concursoId }] : []),
        ],
      },
    );

    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const durationMs = Date.now() - startTime;
    const cacheHit = preCached != null;
    res.setHeader('x-cache-hit', cacheHit ? '1' : '0');
    res.setHeader('x-duration-ms', String(durationMs));
    logger.info('Guru activities sucesso', { feature: 'guru', requestId, correlationId, usuarioId, concursoId, limit, cacheKey, durationMs, cacheHit });
    await logService.logarPerformance('guru.activities', durationMs, { cacheHit, usuarioId, concursoId, limit });
    res.json({ success: true, data: activities });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    logger.error('Erro ao obter atividades (guru)', { feature: 'guru', requestId, message, code, correlationId, durationMs });
    res.status(status).json({ success: false, error: message, code, requestId, correlationId });
  }
}

export async function getSimuladoActivities(req: Request, res: Response): Promise<void> {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const startTime = Date.now();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new AppError('Usuário não autenticado', 401, { code: 'UNAUTHORIZED' });
    }

    const parsed = activitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Parâmetros inválidos', 400, { code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }

    const { limit } = parsed.data;

    const repo = new AlunoDashboardRepository(supabase);
    const service = new GuruDashboardService(repo);

    const concursoId = (req as any).concursoId as string | undefined;
    const cacheKey = `guru:activities:simulados:user:${usuarioId}${concursoId ? `:concurso:${concursoId}` : ''}:limit:${limit}`;
    const logService = new LogService(supabase, 'GURU');
    const cacheManager = CacheManager.getInstance(undefined as any, logService, supabase);

    const preCached = await cacheManager.get<unknown>(cacheKey);
    const activities = await cacheManager.getOrSet(
      cacheKey,
      async () => {
        const all = await service.getActivities(usuarioId, { limit: limit * 2 });
        return all.filter(a => a.type === 'simulado').slice(0, limit);
      },
      {
        ttl: 2,
        dependencies: [
          { type: CacheDependencyType.USER, id: usuarioId },
          ...(concursoId ? [{ type: CacheDependencyType.CONCURSO, id: concursoId }] : []),
        ],
      },
    );

    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const durationMs = Date.now() - startTime;
    const cacheHit = preCached != null;
    res.setHeader('x-cache-hit', cacheHit ? '1' : '0');
    res.setHeader('x-duration-ms', String(durationMs));
    logger.info('Guru activities simulados sucesso', { feature: 'guru', requestId, correlationId, usuarioId, concursoId, limit, cacheKey, durationMs, cacheHit });
    await logService.logarPerformance('guru.activities.simulados', durationMs, { cacheHit, usuarioId, concursoId, limit });
    res.json({ success: true, data: activities });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    logger.error('Erro ao obter atividades (guru simulados)', { feature: 'guru', requestId, message, code, correlationId, durationMs });
    res.status(status).json({ success: false, error: message, code, requestId, correlationId });
  }
}

export async function getFlashcardActivities(req: Request, res: Response): Promise<void> {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const startTime = Date.now();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new AppError('Usuário não autenticado', 401, { code: 'UNAUTHORIZED' });
    }

    const parsed = activitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Parâmetros inválidos', 400, { code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }

    const { limit } = parsed.data;

    const repo = new AlunoDashboardRepository(supabase);
    const service = new GuruDashboardService(repo);

    const concursoId = (req as any).concursoId as string | undefined;
    const cacheKey = `guru:activities:flashcards:user:${usuarioId}${concursoId ? `:concurso:${concursoId}` : ''}:limit:${limit}`;
    const logService = new LogService(supabase, 'GURU');
    const cacheManager = CacheManager.getInstance(undefined as any, logService, supabase);

    const preCached = await cacheManager.get<unknown>(cacheKey);
    const activities = await cacheManager.getOrSet(
      cacheKey,
      async () => {
        const all = await service.getActivities(usuarioId, { limit: limit * 2 });
        return all.filter(a => a.type === 'flashcard').slice(0, limit);
      },
      {
        ttl: 2,
        dependencies: [
          { type: CacheDependencyType.USER, id: usuarioId },
          ...(concursoId ? [{ type: CacheDependencyType.CONCURSO, id: concursoId }] : []),
        ],
      },
    );

    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const durationMs = Date.now() - startTime;
    const cacheHit = preCached != null;
    res.setHeader('x-cache-hit', cacheHit ? '1' : '0');
    res.setHeader('x-duration-ms', String(durationMs));
    logger.info('Guru activities flashcards sucesso', { feature: 'guru', requestId, correlationId, usuarioId, concursoId, limit, cacheKey, durationMs, cacheHit });
    await logService.logarPerformance('guru.activities.flashcards', durationMs, { cacheHit, usuarioId, concursoId, limit });
    res.json({ success: true, data: activities });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    logger.error('Erro ao obter atividades (guru flashcards)', { feature: 'guru', requestId, message, code, correlationId, durationMs });
    res.status(status).json({ success: false, error: message, code, requestId, correlationId });
  }
}

export async function getApostilaActivities(req: Request, res: Response): Promise<void> {
  const correlationId = req.get('x-correlation-id') ?? undefined;
  const startTime = Date.now();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new AppError('Usuário não autenticado', 401, { code: 'UNAUTHORIZED' });
    }

    const parsed = activitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Parâmetros inválidos', 400, { code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }

    const { limit } = parsed.data;

    const repo = new AlunoDashboardRepository(supabase);
    const service = new GuruDashboardService(repo);

    const concursoId = (req as any).concursoId as string | undefined;
    const cacheKey = `guru:activities:apostilas:user:${usuarioId}${concursoId ? `:concurso:${concursoId}` : ''}:limit:${limit}`;
    const logService = new LogService(supabase, 'GURU');
    const cacheManager = CacheManager.getInstance(undefined as any, logService, supabase);

    const preCached = await cacheManager.get<unknown>(cacheKey);
    const activities = await cacheManager.getOrSet(
      cacheKey,
      async () => {
        const all = await service.getActivities(usuarioId, { limit: limit * 2 });
        return all.filter(a => a.type !== 'simulado' && a.type !== 'flashcard').slice(0, limit);
      },
      {
        ttl: 2,
        dependencies: [
          { type: CacheDependencyType.USER, id: usuarioId },
          ...(concursoId ? [{ type: CacheDependencyType.CONCURSO, id: concursoId }] : []),
        ],
      },
    );

    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const durationMs = Date.now() - startTime;
    const cacheHit = preCached != null;
    res.setHeader('x-cache-hit', cacheHit ? '1' : '0');
    res.setHeader('x-duration-ms', String(durationMs));
    logger.info('Guru activities apostilas sucesso', { feature: 'guru', requestId, correlationId, usuarioId, concursoId, limit, cacheKey, durationMs, cacheHit });
    await logService.logarPerformance('guru.activities.apostilas', durationMs, { cacheHit, usuarioId, concursoId, limit });
    res.json({ success: true, data: activities });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    logger.error('Erro ao obter atividades (guru apostilas)', { feature: 'guru', requestId, message, code, correlationId, durationMs });
    res.status(status).json({ success: false, error: message, code, requestId, correlationId });
  }
}


