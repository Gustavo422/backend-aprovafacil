import { optimizedAuthMiddleware } from './optimized-auth.middleware.js';

// Re-export para compatibilidade com imports existentes
export const AuthenticatedRequest = null; // Interface será definida no arquivo TypeScript
export const unifiedAuthMiddleware = optimizedAuthMiddleware;