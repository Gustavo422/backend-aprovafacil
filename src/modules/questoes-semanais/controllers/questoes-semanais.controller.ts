import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICacheService, ILogService } from '../../../core/interfaces/index.js';
import { QuestoesSemanaisService } from '../questoes-semanais.service.js';
import { SupabaseQuestoesSemanaisRepository } from '../questoes-semanais.repository.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes 
} from '../validators/questoes-semanais.validator.js';

export function createQuestoesSemanaisController(deps: { supabase: SupabaseClient; cache: ICacheService; log: ILogService }) {
  const repo = new SupabaseQuestoesSemanaisRepository(deps.supabase);
  const service = new QuestoesSemanaisService(deps.supabase, repo, deps.cache, deps.log);

  return {
    getAtual: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const requestId = req.get('x-request-id') ?? undefined;
      const start = Date.now();
      
      try {
        const usuarioId = (req as any)?.user?.id as string | undefined;
        const concursoId = (req as any)?.concursoId as string | undefined;
        
        if (!concursoId) {
          const response = createErrorResponse(
            ErrorCodes.CONCURSO_REQUIRED,
            'Concurso não configurado',
            undefined,
            correlationId,
            requestId
          );
          res.status(422).json(response);
          return;
        }

        const data = await service.obterSemanaAtual(concursoId, usuarioId);
        const duration = Date.now() - start;
        
        const response = createSuccessResponse(data, undefined, correlationId, duration);
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        res.status(200).json(response);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
        const errorCode = (error as any)?.code ?? ErrorCodes.INTERNAL_ERROR;
        
        const response = createErrorResponse(
          errorCode,
          errorMessage,
          undefined,
          correlationId,
          requestId
        );
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        const statusCode = (error as any)?.statusCode ?? 500;
        res.status(statusCode).json(response);
      }
    },

    getHistorico: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const requestId = req.get('x-request-id') ?? undefined;
      const start = Date.now();
      
      try {
        const usuarioId = (req as any)?.user?.id as string | undefined;
        if (!usuarioId) {
          const response = createErrorResponse(
            ErrorCodes.UNAUTHORIZED,
            'Não autenticado',
            undefined,
            correlationId,
            requestId
          );
          res.status(401).json(response);
          return;
        }

        const concursoId = (req as any)?.concursoId as string | undefined;
        if (!concursoId) {
          const response = createErrorResponse(
            ErrorCodes.CONCURSO_REQUIRED,
            'Concurso não configurado',
            undefined,
            correlationId,
            requestId
          );
          res.status(422).json(response);
          return;
        }

        const cursor = (req.query?.cursor as string | undefined) ?? undefined;
        const limit = (req.query?.limit as number | undefined) ?? 10;
        
        const data = await service.listarHistorico(usuarioId, concursoId, cursor, limit);
        const duration = Date.now() - start;
        
        const pagination = {
          page: 1, // Histórico usa cursor, não paginação tradicional
          limit: data.limit,
          total: data.items.length, // Aproximado
          totalPages: 1,
          nextCursor: data.nextCursor || undefined,
        };
        
        const response = createSuccessResponse(data.items, pagination, correlationId, duration);
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        res.status(200).json(response);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
        const errorCode = (error as any)?.code ?? ErrorCodes.INTERNAL_ERROR;
        
        const response = createErrorResponse(
          errorCode,
          errorMessage,
          undefined,
          correlationId,
          requestId
        );
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        const statusCode = (error as any)?.statusCode ?? 500;
        res.status(statusCode).json(response);
      }
    },

    getRoadmap: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const requestId = req.get('x-request-id') ?? undefined;
      const start = Date.now();
      
      try {
        const usuarioId = (req as any)?.user?.id as string | undefined;
        if (!usuarioId) {
          const response = createErrorResponse(
            ErrorCodes.UNAUTHORIZED,
            'Não autenticado',
            undefined,
            correlationId,
            requestId
          );
          res.status(401).json(response);
          return;
        }

        const concursoId = (req as any)?.concursoId as string | undefined;
        if (!concursoId) {
          const response = createErrorResponse(
            ErrorCodes.CONCURSO_REQUIRED,
            'Concurso não configurado',
            undefined,
            correlationId,
            requestId
          );
          res.status(422).json(response);
          return;
        }

        const data = await service.obterRoadmap(usuarioId, concursoId);
        const duration = Date.now() - start;
        
        const response = createSuccessResponse(data, undefined, correlationId, duration);
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        res.status(200).json(response);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
        const errorCode = (error as any)?.code ?? ErrorCodes.INTERNAL_ERROR;
        
        const response = createErrorResponse(
          errorCode,
          errorMessage,
          undefined,
          correlationId,
          requestId
        );
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        const statusCode = (error as any)?.statusCode ?? 500;
        res.status(statusCode).json(response);
      }
    },

    postConcluir: async (req: Request, res: Response): Promise<void> => {
      const correlationId = req.get('x-correlation-id') ?? undefined;
      const requestId = req.get('x-request-id') ?? undefined;
      const start = Date.now();
      
      try {
        const usuarioId = (req as any)?.user?.id as string | undefined;
        if (!usuarioId) {
          const response = createErrorResponse(
            ErrorCodes.UNAUTHORIZED,
            'Não autenticado',
            undefined,
            correlationId,
            requestId
          );
          res.status(401).json(response);
          return;
        }

        const concursoId = (req as any)?.concursoId as string | undefined;
        if (!concursoId) {
          const response = createErrorResponse(
            ErrorCodes.CONCURSO_REQUIRED,
            'Concurso não configurado',
            undefined,
            correlationId,
            requestId
          );
          res.status(422).json(response);
          return;
        }

        const numeroSemana = (req.params as any).numero_semana as number;
        if (!numeroSemana || numeroSemana <= 0) {
          const response = createErrorResponse(
            ErrorCodes.INVALID_INPUT,
            'numero_semana inválido',
            { numeroSemana },
            correlationId,
            requestId
          );
          res.status(400).json(response);
          return;
        }

        const payload = req.body;
        if (!payload) {
          const response = createErrorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            'Body da requisição é obrigatório',
            undefined,
            correlationId,
            requestId
          );
          res.status(400).json(response);
          return;
        }
        
        const resultado = await service.concluirSemana(usuarioId, concursoId, numeroSemana, payload);
        const duration = Date.now() - start;
        
        const response = createSuccessResponse({
          proximaSemana: resultado.proximaSemana,
          avancou: resultado.avancou,
          modoDesbloqueio: resultado.modoDesbloqueio,
        }, undefined, correlationId, duration);
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        res.status(200).json(response);
      } catch (error) {
        const duration = Date.now() - start;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido';
        const errorCode = (error as any)?.code ?? ErrorCodes.INTERNAL_ERROR;
        
        const response = createErrorResponse(
          errorCode,
          errorMessage,
          undefined,
          correlationId,
          requestId
        );
        
        if (correlationId) res.setHeader('x-correlation-id', correlationId);
        if (requestId) res.setHeader('x-request-id', requestId);
        res.setHeader('x-feature', 'questoes-semanais');
        res.setHeader('X-Server-Duration', String(duration));
        
        const statusCode = (error as any)?.statusCode ?? 500;
        res.status(statusCode).json(response);
      }
    },
  };
}


