import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase-unified.js';
import { ConcursoFilter } from '../utils/concurso-filter.js';
import { logger } from '../lib/logger.js';
import jwt from 'jsonwebtoken';

// Debug helper function
const debug = (message: string, ...optionalParams: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    // Using logger instead of console for consistency
    if (optionalParams.length > 0) {
      logger.debug(`[DEBUG] ${message}`, { data: optionalParams });
    } else {
      logger.debug(`[DEBUG] ${message}`);
    }
  }
};

/**
 * Verifica se uma rota específica precisa de filtro de concurso
 * Considera rotas montadas em base path (ex.: /api) usando originalUrl/baseUrl+path
 * @param pathOrUrl - Caminho ou URL original da requisição
 * @returns true se a rota precisar de filtro de concurso, false caso contrário
 */
export const needsConcursoFilter = (pathOrUrl: string): boolean => {
  // Rotas que precisam do filtro de concurso
  const concursoRoutes = [
    '/api/apostilas',
    '/api/simulados',
    '/api/v1/simulados',
    '/api/questoes',
    '/api/flashcards',
    '/api/progresso',
    '/api/estatisticas',
    '/api/dashboard',
  ];

  const candidate = pathOrUrl || '';
  return concursoRoutes.some(route => candidate.startsWith(route));
};

/**
 * Resolve o caminho relevante da requisição para checagem de rota
 */
export const resolveRequestPath = (req: Request): string => {
  // Preferir originalUrl (inclui base), fallback para baseUrl+path
  const original = (req.originalUrl ?? '').split('?')[0];
  if (original) return original;
  const combined = `${req.baseUrl ?? ''}${req.path ?? ''}`;
  return combined || req.path || '';
};

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

/**
 * Middleware global para aplicar filtro de concurso automaticamente
 * 
 * Este middleware:
 * 1. Identifica se a rota precisa do filtro de concurso
 * 2. Obtém o concurso ativo do usuário
 * 3. Adiciona o concursoId ao request para uso posterior
 */
export const globalConcursoFilterMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    debug('globalConcursoFilterMiddleware - Iniciando processamento da rota:', req.path);
    
    // Se o usuário já está autenticado, usar os dados existentes
    if (req.user?.id) {
      debug('Usuário já autenticado:', { userId: req.user.id, email: req.user.email });
    } else {
      // Tentar autenticar o usuário automaticamente
      const authHeader = req.headers.authorization;
      if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
          const tmp = authHeader.substring(7);
          const masked = tmp.length > 8 ? `${tmp.substring(0, 4)}...${tmp.substring(tmp.length - 4)}` : '[REDACTED]';
          debug('Tentando autenticação automática. Auth header:', `Bearer ${masked}`);
        } else {
          const masked = authHeader.length > 8 ? `${authHeader.substring(0, 4)}...${authHeader.substring(authHeader.length - 4)}` : '[REDACTED]';
          debug('Tentando autenticação automática. Auth header:', masked);
        }
      } else {
        debug('Tentando autenticação automática. Auth header:', 'ausente');
      }
      
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const maskedToken = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '[REDACTED]';
          debug('Token extraído para autenticação automática:', maskedToken);
          const jwtSecret = process.env.JWT_SECRET ?? '';
          debug('JWT Secret disponível:', jwtSecret ? 'sim' : 'não');
          
          if (jwtSecret) {
            debug('Verificando token JWT...');
            const decoded = jwt.verify(token, jwtSecret) as { usuarioId: string; email: string; role: string };
            debug('Token decodificado:', { 
              usuarioId: decoded.usuarioId, 
              email: decoded.email,
              role: decoded.role, 
            });
            
            req.user = {
              id: decoded.usuarioId,
              email: decoded.email ?? '',
              role: decoded.role ?? 'user',
            };
            
            debug('Usuário autenticado automaticamente:', { 
              userId: req.user.id, 
              email: req.user.email, 
            });
          } else {
            debug('JWT_SECRET não configurado');
          }
        } catch (authError) {
          debug('Erro na autenticação automática:', authError);
          // Continuar sem autenticação
        }
      } else {
        debug('Header Authorization não encontrado ou formato inválido');
      }
    }
    
    // Verificar se o usuário está autenticado após tentativa de autenticação automática
    if (!req.user?.id) {
      const errorMsg = 'Usuário não autenticado, pulando filtro de concurso';
      logger.debug(errorMsg);
      debug(errorMsg);
      next();
      return;
    }

    debug('Usuário autenticado:', { userId: req.user.id, email: req.user.email });

    // Verificar se a rota precisa do filtro de concurso
    const pathForCheck = resolveRequestPath(req);
    const needsFilter = needsConcursoFilter(pathForCheck);

    debug('Verificando necessidade de filtro:', { 
      path: pathForCheck,
      needsFilter,
    });

    if (!needsFilter) {
      const msg = `Rota ${pathForCheck} não precisa de filtro de concurso`;
      logger.debug(msg);
      debug(msg);
      next();
      return;
    }

    debug(`Rota ${pathForCheck} requer filtro de concurso`);

    // Obter o concurso ativo do usuário
    debug(`Buscando concurso ativo para usuário ${req.user?.id}`);
    const concursoFilter = new ConcursoFilter(supabase);
    
    try {
      const concursoId = await concursoFilter.getUserConcurso(req.user?.id ?? '');
      debug(`Concurso ativo para usuário ${req.user?.id}:`, concursoId);

      if (!concursoId) {
        const errorMsg = `Usuário ${req.user?.id} não tem concurso ativo configurado`;
        logger.warn(errorMsg);
        debug(errorMsg);
        
        // Retornar erro 400 para rotas que precisam de concurso
        res.status(400).json({
          success: false,
          message: 'Concurso ativo não configurado',
          error: 'CONCURSO_NOT_CONFIGURED',
        });
        return;
      }

      // Adicionar o concursoId ao request
      req.concursoId = concursoId;
      debug(`ConcursoId ${concursoId} adicionado ao request`);

      // Adicionar o concursoId aos headers para uso posterior
      res.setHeader('x-concurso-id', concursoId);
      debug(`Header x-concurso-id definido: ${concursoId}`);

      next();
    } catch (error) {
      const errorMsg = `Erro ao obter concurso ativo para usuário ${req.user?.id}: ${error}`;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(errorMsg, { error: errorMessage });
      debug(errorMsg, error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno ao obter concurso ativo',
        error: 'INTERNAL_ERROR',
      });
    }
  } catch (error) {
    const errorMsg = `Erro no middleware de filtro de concurso: ${error}`;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(errorMsg, { error: errorMessage });
    debug(errorMsg, error);
    
    res.status(500).json({
      success: false,
      message: 'Erro interno no middleware',
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware para verificar se o usuário tem acesso ao recurso específico
 */
export const checkConcursoAccessMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Verificar se a rota realmente precisa de concurso antes de aplicar a checagem
    const pathForCheck = resolveRequestPath(req);
    const needsFilter = needsConcursoFilter(pathForCheck);

    if (!needsFilter) {
      // Rota não requer contexto de concurso – seguir o fluxo normalmente
      next();
      return;
    }

    const concursoId = getConcursoIdFromRequest(req);
    
    if (!concursoId) {
      res.status(400).json({
        success: false,
        message: 'Concurso não especificado',
        error: 'CONCURSO_NOT_SPECIFIED',
      });
      return;
    }

    // Verificar se o usuário tem acesso ao concurso
    const concursoFilter = new ConcursoFilter(supabase);
    const userConcursoId = await concursoFilter.getUserConcurso(req.user?.id ?? '');

    if (userConcursoId !== concursoId) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado ao concurso',
        error: 'CONCURSO_ACCESS_DENIED',
      });
      return;
    }

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Erro no middleware de verificação de acesso ao concurso:', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      message: 'Erro interno na verificação de acesso',
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Função helper para obter o concursoId do request
 * @param req - Request com concursoId adicionado pelo middleware
 * @returns O concursoId ou null se não estiver disponível
 */
export const getConcursoIdFromRequest = (req: AuthenticatedRequest): string | null => {
  return req.concursoId ?? (req.headers['x-concurso-id'] as string) ?? null;
};

