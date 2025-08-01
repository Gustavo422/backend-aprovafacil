import { adminAuthMiddleware } from './optimized-auth.middleware.js';

// Re-export para compatibilidade com imports existentes
export const createAdminAuthMiddleware = (_userRepository) => adminAuthMiddleware;