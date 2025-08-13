import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICacheService, ILogService } from '../../../core/interfaces/index.js';
import { AppError } from '../../../core/errors/index.js';
import { SimuladosService } from '../services/simulados.service.js';
import { SupabaseSimuladosRepository } from '../repositories/simulados.repository.js';

export function createSimuladosController(deps: { supabase: SupabaseClient; cache: ICacheService; log: ILogService }) {
  const repo = new SupabaseSimuladosRepository(deps.supabase);
  const service = new SimuladosService(deps.supabase, repo, deps.cache, deps.log);

  return {
    listarSimulados: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const start = Date.now();
      try {
        const { page, limit, concurso_id, categoria_id, dificuldade, publico, search } = req.query;
        // Middleware global pode ter populado concursoId
        const concursoIdFromMiddleware = (req as any).concursoId as string | undefined;
        const result = await service.listarSimulados({
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          concurso_id: (concurso_id as string) ?? concursoIdFromMiddleware,
          categoria_id: (categoria_id as string) ?? undefined,
          dificuldade: (dificuldade as string) ?? undefined,
          publico: typeof publico === 'string' ? publico === 'true' : (publico as boolean | undefined),
          search: (search as string) ?? undefined,
        });

        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        const err = error as AppError;
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.status(err.statusCode ?? 500).json({ success: false, error: err.message, code: err.code ?? 'INTERNAL_ERROR' });
      }
    },

    buscarSimuladoPorSlug: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const start = Date.now();
      try {
        const { slug } = req.params as { slug: string };
        if (!slug) throw new AppError('Slug é obrigatório', 400, { code: 'VALIDATION_ERROR' });
        const result = await service.buscarDetalhePorSlug(slug);
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        const err = error as AppError;
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        res.setHeader('X-Server-Duration', String(Date.now() - start));
        res.status(err.statusCode ?? 500).json({ success: false, error: err.message, code: err.code ?? 'INTERNAL_ERROR' });
      }
    },
  };
}


