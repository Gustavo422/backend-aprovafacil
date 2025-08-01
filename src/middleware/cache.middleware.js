// Middleware de cache básico para compatibilidade
export const cacheMiddleware = (req, res, next) => {
  // Implementação básica de cache
  next();
};

export const invalidateCacheMiddleware = (req, res, next) => {
  // Implementação básica de invalidação de cache
  next();
};