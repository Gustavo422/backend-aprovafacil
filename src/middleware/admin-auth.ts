import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { createDebugger } from '../utils/debugger.js';

// Create a debugger specific for admin authentication
const debug = createDebugger('middleware:admin-auth');

/**
 * Middleware for verifying admin role
 * This middleware should be used after the JWT authentication middleware
 */
export function createAdminAuthMiddleware(userRepository: UserRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      debug('Verifying admin role for route: %s %s', req.method, req.path);
      
      // Check if user exists in request (should be set by JWT middleware)
      if (!req.user || !req.user.id) {
        debug('No authenticated user found in request');
        return res.status(401).json({ 
          error: 'Autenticação necessária',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      // Get user ID from request
      const userId = req.user.id;
      
      // Verify user exists in both tables
      const userExists = await userRepository.verifyUserExistsInBothTables(userId);
      if (!userExists) {
        debug('User not found in both tables: %s', userId);
        return res.status(401).json({ 
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Get user from repository to verify role
      const user = await userRepository.findById(userId);
      if (!user) {
        debug('User not found: %s', userId);
        return res.status(401).json({ 
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user is active
      if (!user.ativo) {
        debug('User is not active: %s', userId);
        return res.status(403).json({ 
          error: 'Conta desativada',
          code: 'ACCOUNT_DISABLED'
        });
      }
      
      // Check if user has admin role
      if (user.role !== 'admin') {
        debug('User is not an admin: %s (role: %s)', userId, user.role);
        return res.status(403).json({ 
          error: 'Acesso restrito a administradores',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // User is an admin, proceed to next middleware
      debug('Admin access granted for user: %s', userId);
      next();
    } catch (error) {
      debug('Error in admin auth middleware: %s', error.message);
      return res.status(500).json({ 
        error: 'Erro interno de autenticação',
        code: 'AUTH_MIDDLEWARE_ERROR'
      });
    }
  };
}

/**
 * Middleware for verifying admin role from token payload
 * This is a faster alternative that doesn't require a database lookup
 * but relies on the role being correctly set in the token
 */
export function createFastAdminCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      debug('Fast admin role check for route: %s %s', req.method, req.path);
      
      // Check if user exists in request (should be set by JWT middleware)
      if (!req.user) {
        debug('No authenticated user found in request');
        return res.status(401).json({ 
          error: 'Autenticação necessária',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      // Check if user has admin role directly from the request
      if (req.user.role !== 'admin') {
        debug('User is not an admin: %s (role: %s)', req.user.id, req.user.role);
        return res.status(403).json({ 
          error: 'Acesso restrito a administradores',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // User is an admin, proceed to next middleware
      debug('Admin access granted for user: %s', req.user.id);
      next();
    } catch (error) {
      debug('Error in fast admin check middleware: %s', error.message);
      return res.status(500).json({ 
        error: 'Erro interno de autenticação',
        code: 'AUTH_MIDDLEWARE_ERROR'
      });
    }
  };
}