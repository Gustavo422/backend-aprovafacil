import { Request, Response, NextFunction } from 'express';
import { createDebugger } from '../utils/debugger.js';
import { UserRepository } from '../repositories/UserRepository';
import '../types/express.js';
// Import CSRF functions directly where needed

// Create a debugger specific for the authentication middleware
const debug = createDebugger('middleware:auth');

// Global instance of UserRepository for admin verification
let userRepository: UserRepository | null = null;

/**
 * Initialize the auth middleware with dependencies
 * @param repo - UserRepository instance
 */
export function initAuthMiddleware(repo: UserRepository) {
  userRepository = repo;
  debug('Auth middleware initialized with UserRepository');
}

/**
 * Middleware for requiring authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  debug('Verificando autenticação para rota: %s %s', req.method, req.path);
  
  if (!req.user) {
    debug('Acesso negado: usuário não autenticado');
    return res.status(401).json({ 
      error: 'Usuário não autenticado',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  debug('Usuário autenticado: %o', { id: req.user.id, role: req.user.role });
  next();
}

/**
 * Middleware for requiring admin role
 * This is a legacy version that only checks the role in the request object
 * For more secure admin verification, use the admin-auth middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  debug('Verificando permissão de administrador para rota: %s %s', req.method, req.path);
  
  if (!req.user) {
    debug('Acesso negado: usuário não autenticado');
    return res.status(401).json({ 
      error: 'Usuário não autenticado',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    debug('Acesso negado: usuário %s não é administrador (role: %s)', req.user.id, req.user.role);
    return res.status(403).json({ 
      error: 'Acesso restrito a administradores',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  debug('Acesso de administrador concedido para usuário: %s', req.user.id);
  next();
}

/**
 * Enhanced middleware for requiring admin role with database verification
 * This middleware verifies the admin role in the database
 */
export function requireAdminWithVerification(req: Request, res: Response, next: NextFunction) {
  debug('Verificando permissão de administrador com verificação em banco para rota: %s %s', req.method, req.path);
  
  if (!req.user) {
    debug('Acesso negado: usuário não autenticado');
    return res.status(401).json({ 
      error: 'Usuário não autenticado',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Check if userRepository is initialized
  if (!userRepository) {
    debug('UserRepository não inicializado. Usando verificação simples.');
    return requireAdmin(req, res, next);
  }
  
  // Verify admin role in database
  userRepository.findById(req.user.id)
    .then(user => {
      if (!user) {
        debug('Usuário não encontrado: %s', req.user.id);
        return res.status(401).json({ 
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (!user.ativo) {
        debug('Usuário desativado: %s', req.user.id);
        return res.status(403).json({ 
          error: 'Conta desativada',
          code: 'ACCOUNT_DISABLED'
        });
      }
      
      if (user.role !== 'admin') {
        debug('Acesso negado: usuário %s não é administrador (role: %s)', req.user.id, user.role);
        return res.status(403).json({ 
          error: 'Acesso restrito a administradores',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // Verify user exists in both tables
      return userRepository!.verifyUserExistsInBothTables(user.id)
        .then(exists => {
          if (!exists) {
            debug('Usuário não encontrado em ambas as tabelas: %s', user.id);
            return res.status(401).json({ 
              error: 'Usuário não encontrado na tabela de autenticação',
              code: 'USER_NOT_FOUND_IN_AUTH'
            });
          }
          
          debug('Acesso de administrador concedido para usuário: %s', user.id);
          next();
        });
    })
    .catch(error => {
      debug('Erro ao verificar permissão de administrador: %s', error.message);
      return res.status(500).json({ 
        error: 'Erro interno de autenticação',
        code: 'AUTH_MIDDLEWARE_ERROR'
      });
    });
}

/**
 * Export CSRF middleware from the csrf module
 */
export { setCsrfToken, validateCsrf } from './csrf.js';
