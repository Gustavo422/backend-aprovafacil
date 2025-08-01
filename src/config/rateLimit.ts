import rateLimit from 'express-rate-limit';

// Configuração centralizada de rate limit
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const RATE_LIMIT_MAX = 100; // 100 requisições por janela 

// Função rateLimit para uso nos middlewares
export const rateLimitMiddleware = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Exportar como 'rateLimit' para compatibilidade
export { rateLimitMiddleware as rateLimit };



