import { Request, Response, NextFunction } from 'express';
import { userCache } from '../core/cache/user-cache.service.js';

/**
 * Middleware de cache para otimizar consultas
 */
export const cacheMiddleware = (_duration: number = 300) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Implementação básica de cache
    // TODO: Implementar cache mais robusto
    next();
  };
};

/**
 * Middleware para invalidar cache
 */
export const invalidateCacheMiddleware = (_path?: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Invalidar cache quando necessário
    userCache.clearCache();
    next();
  };
};