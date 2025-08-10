import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase-unified.js';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('unified-auth');

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome: string;
  };
}

/**
 * Middleware de autenticação unificado
 * Substitui todos os middlewares de autenticação existentes
 */
export const unifiedAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const typedReq = req as AuthenticatedRequest;
  try {
    const authHeader = typedReq.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
      });
      return;
    }

    typedReq.user = {
      id: user.id,
      email: user.email ?? '',
      role: user.user_metadata?.role ?? 'user',
      nome: user.user_metadata?.nome ?? user.email ?? '',
    };

    next();
  } catch (error) {
    logger.error('Erro na autenticação unificada:', { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

export type { AuthenticatedRequest }; 