import { jwtAuthMiddleware } from './jwt-auth.middleware.js';

// Re-export para compatibilidade com imports existentes
export const requireAuth = jwtAuthMiddleware;