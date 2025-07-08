import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from '../config/rateLimit.js';

// Middleware de rate limiting simples
export const createRateLimit = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    const userRequests = requests.get(ip);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userRequests.count >= max) {
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
    next();
  };
};

// Exportar rate limit pré-configurado
export const rateLimit = createRateLimit(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX); 