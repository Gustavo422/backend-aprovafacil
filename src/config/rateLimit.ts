import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// Configuração centralizada de rate limit
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const RATE_LIMIT_MAX = 100; // 100 requisições por janela 

// Função rateLimit para uso nos middlewares, com envelope padronizado e metadados
export const rateLimitMiddleware = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, _next: NextFunction, _options) => {
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    // requestId vem do request-logger (header definido no response)
    const requestIdHeader = res.getHeader('x-request-id');
    const requestId = Array.isArray(requestIdHeader)
      ? (requestIdHeader[0] as string)
      : (requestIdHeader as string | undefined);
    const correlationId = req.get('x-correlation-id') ?? undefined;
    if (correlationId) res.setHeader('x-correlation-id', correlationId);

    res.status(429).json({
      success: false,
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      requestId,
      correlationId,
    });
  },
});

// Exportar como 'rateLimit' para compatibilidade
export { rateLimitMiddleware as rateLimit };



