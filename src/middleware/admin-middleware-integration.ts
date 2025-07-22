import { Express } from 'express';
import { UserRepository } from '../repositories/UserRepository';
// import { createJwtAuthMiddleware } from './jwt-auth';
import { createAdminAuthMiddleware } from './admin-auth';
import { initAuthMiddleware } from './auth';
import { createAdminRoutes } from '../routes/admin-example';

/**
 * Integrates admin authentication middleware into the application
 * @param app - Express application
 * @param userRepository - UserRepository instance
 * @param jwtSecret - JWT secret key
 */
export function integrateAdminMiddleware(
  app: Express,
  userRepository: UserRepository,
  jwtSecret: string
): void {
  // Initialize auth middleware with UserRepository
  initAuthMiddleware(userRepository);
  
  // Create middleware instances
  // const jwtAuth = createJwtAuthMiddleware(userRepository, jwtSecret);
  const adminAuth = createAdminAuthMiddleware(userRepository);
  
  // Register admin routes
  app.use('/api/admin', adminAuth); // Protect all admin routes
  
  // Register example admin routes
  app.use('/api', createAdminRoutes(userRepository));
  
  console.log('Admin middleware integrated successfully');
}

/**
 * Example of how to use this integration in app.ts:
 * 
 * import { integrateAdminMiddleware } from './middleware/admin-middleware-integration';
 * 
 * // In your app initialization:
 * const userRepository = new UserRepository();
 * const jwtSecret = process.env.JWT_SECRET || 'default-secret';
 * 
 * // After initializing Express app:
 * integrateAdminMiddleware(app, userRepository, jwtSecret);
 */