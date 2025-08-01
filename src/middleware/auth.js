import { optimizedAuthMiddleware } from './optimized-auth.middleware.js';

// Re-export para compatibilidade com imports existentes
export const requireAuth = optimizedAuthMiddleware;