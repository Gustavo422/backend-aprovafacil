import { createRequestLoggerMiddleware } from '../lib/logging/request-logger-middleware.js';

// Re-export para compatibilidade com imports existentes
export const requestLogger = createRequestLoggerMiddleware();