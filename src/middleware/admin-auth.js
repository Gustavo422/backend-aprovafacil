// @ts-nocheck
import { optimizedAuthMiddleware } from './optimized-auth.middleware.js';
// @ts-ignore - Arquivo JS de compatibilidade, não emitir declarações TS

// Re-export para compatibilidade sem tipos privados
export const adminAuthMiddleware = optimizedAuthMiddleware;
export const createAdminAuthMiddleware = () => optimizedAuthMiddleware;