import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase-unified.js';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('optimized-auth');

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome: string;
  };
}

/**
 * Middleware de autenticação otimizado
 * Substitui todos os middlewares de autenticação existentes
 */
export const optimizedAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = {
        message: 'Token de autenticação não fornecido',
        status: 401,
      };
      throw error;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      const authError = {
        message: 'Token inválido ou expirado',
        status: 401,
      };
      throw authError;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
      nome: user.user_metadata?.nome || user.email || '',
    };

    next();
  } catch (error) {
    const authError = error as { message: string; status: number };
    logger.warn('Falha na autenticação', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: authError.message,
    });

    res.status(authError.status || 401).json({
      success: false,
      error: authError.message || 'Erro de autenticação',
    });
  }
};

export { AuthenticatedRequest };

// Re-export para compatibilidade com imports existentes
export const adminAuthMiddleware = optimizedAuthMiddleware; 