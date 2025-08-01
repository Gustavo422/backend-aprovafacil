import { Request, Response, NextFunction } from 'express';
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
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
      nome: user.user_metadata?.nome || user.email || '',
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

export { AuthenticatedRequest }; 