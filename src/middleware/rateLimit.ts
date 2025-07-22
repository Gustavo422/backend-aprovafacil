import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from '../config/rateLimit.js';
import { createDebugger } from '../utils/debugger.js';

// Criar um debugger específico para o middleware de rate limiting
const debug = createDebugger('middleware:rate-limit');

// Middleware de rate limiting simples
export const createRateLimit = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const path = req.originalUrl;
    
    debug('Verificando rate limit para IP: %s, rota: %s', ip, path);

    const userRequests = requests.get(ip);

    if (!userRequests || now > userRequests.resetTime) {
      debug('Primeira requisição ou janela de tempo expirada para IP: %s', ip);
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userRequests.count >= max) {
      debug('Rate limit excedido para IP: %s (%d requisições em %dms)', 
        ip, userRequests.count, windowMs);
      
      logger.warn(`Rate limit excedido para IP: ${ip}`, undefined, {
        ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return;
    }

    userRequests.count++;
    debug('Requisição permitida para IP: %s (contagem: %d/%d)', 
      ip, userRequests.count, max);
    next();
  };
};

// Exportar rate limit pré-configurado
export const rateLimit = createRateLimit(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX); 



