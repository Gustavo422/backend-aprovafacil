import express from 'express';
import { createAdminAuthMiddleware } from '../middleware/admin-auth';
import { requireAdminWithVerification, validateCsrf } from '../middleware/auth';
import { UserRepository } from '../repositories/UserRepository';

/**
 * Example of how to use the admin middleware
 * @param userRepository - UserRepository instance
 * @returns Express router
 */
export function createAdminRoutes(userRepository: UserRepository) {
  const router = express.Router();
  
  // Create middleware instances
  // const jwtAuth = createJwtAuthMiddleware(userRepository, jwtSecret);
  const adminAuth = createAdminAuthMiddleware(userRepository);
  
  // Example route using the admin middleware
  router.get('/admin/dashboard', 
    // jwtAuth,                    // First verify JWT token
    adminAuth,                  // Then verify admin role
    (req, res) => {
      res.json({
        success: true,
        message: 'Admin dashboard access granted',
        user: req.user
      });
    }
  );
  
  // Example route using the enhanced requireAdminWithVerification middleware
  router.get('/admin/users', 
    // jwtAuth,                           // First verify JWT token
    requireAdminWithVerification,      // Then verify admin role with database check
    (req, res) => {
      res.json({
        success: true,
        message: 'Admin users access granted',
        user: req.user
      });
    }
  );
  
  // Example route for admin-only operations
  router.post('/admin/users', 
    // jwtAuth,
    adminAuth,
    validateCsrf,  // Add CSRF protection
    (req, res) => {
      // Admin-only operation
      res.json({
        success: true,
        message: 'User created successfully',
        data: {
          id: 'new-user-id',
          // Other user data
        }
      });
    }
  );
  
  return router;
}