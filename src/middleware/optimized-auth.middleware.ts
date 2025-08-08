import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('optimized-auth');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome: string;
  };
}

/**
 * Middleware de autenticação otimizado usando JWT
 */
export const optimizedAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    // Log seguro do header Authorization em modo debug do serviço de logging
    if (process.env.DEBUG_AUTH) {
      if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
          const tmp = authHeader.substring(7);
          const masked = tmp.length > 8 ? `${tmp.substring(0, 4)}...${tmp.substring(tmp.length - 4)}` : '[REDACTED]';
          logger.debug?.('Authorization header', { authorization: `Bearer ${masked}` });
        } else {
          const masked = authHeader.length > 8 ? `${authHeader.substring(0, 4)}...${authHeader.substring(authHeader.length - 4)}` : '[REDACTED]';
          logger.debug?.('Authorization header', { authorization: masked });
        }
      } else {
        logger.debug?.('Authorization header', { authorization: 'null' });
      }
    }
    if (!authHeader?.startsWith('Bearer ')) {
      const error = {
        message: 'Token de autenticação não fornecido',
        status: 401,
      };
      throw error;
    }

    const token = authHeader.substring(7);
    const maskedToken = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '[REDACTED]';
    process.env.DEBUG_AUTH && logger.debug?.('Token extraído', { token: maskedToken });
    
    if (!token || token === 'null') {
      const error = {
        message: 'Token inválido',
        status: 401,
      };
      throw error;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'fallback-secret') as { usuarioId: string; email: string; role?: string; nome?: string };
      
      req.user = {
        id: decoded.usuarioId, // CORRIGIDO: usar usuarioId em vez de id
        email: decoded.email,
        role: decoded.role ?? 'user',
        nome: decoded.nome ?? decoded.email,
      };
      
      logger.info('Autenticação bem-sucedida', { 
        userId: req.user.id, 
        email: req.user.email,
        path: req.path, 
      });
      
      next();
    } catch {
      logger.warn('Falha na autenticação', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: 'Token inválido',
        path: req.path,
      });
      
      res.status(401).json({
        success: false,
        error: 'Token inválido',
      });
    }
  } catch (error: unknown) {
    logger.warn('Falha na autenticação', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    
    res.status((error as { status?: number }).status ?? 401).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}; 