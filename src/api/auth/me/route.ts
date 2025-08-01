import { Request, Response } from 'express';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

/**
 * GET /api/auth/me - User verification endpoint
 * 
 * This endpoint verifies the current user's authentication status
 * and returns user information for valid tokens.
 * 
 * Rate limiting is applied but with a more lenient limit:
 * - 30 attempts per 15 minutes per IP address
 */
export const meHandler = async (req: Request, res: Response) => {
  const authLogger = logger;
  
  try {
    authLogger.debug('Verificando usuário autenticado');
    
    // Extract token from Authorization header or cookies
    let token: string | undefined;
    
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, try to get from cookies
    if (!token) {
      const cookieToken = req.cookies?.accessToken;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    // If no token found, return unauthorized
    if (!token) {
      authLogger.warn('Token de autenticação não fornecido');
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Token de autenticação necessário',
        },
      });
    }
    
    // Initialize dependencies

    const authService = new EnhancedAuthService(supabase, {
      jwtSecret: process.env.JWT_SECRET || '',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10),
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10),
    });
    
    // Validate token and get user information
    const tokenData = await authService.validateAccessToken(token);
    
    if (!tokenData.valid || !tokenData.user) {
      authLogger.warn('Token inválido ou usuário não encontrado');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token inválido ou expirado',
        },
      });
    }
    authLogger.info('Token validado com sucesso', { usuarioId: tokenData.user.id });
    
    // Return user information
    return res.json({
      success: true,
      data: {
        id: tokenData.user.id,
        email: tokenData.user.email,
        nome: tokenData.user.nome,
        role: tokenData.user.role,
        ativo: tokenData.user.ativo,
        primeiro_login: tokenData.user.primeiro_login,
      },
    });
  } catch (error) {
    authLogger.error('Erro ao verificar autenticação', { error: error.message });
    
    // Determine appropriate error response
    if (error.message === 'Token não fornecido') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Token de autenticação necessário',
        },
      });
    } else if (error.message === 'Token inválido') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token inválido',
        },
      });
    } else if (error.message === 'Token expirado') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expirado, faça login novamente',
        },
      });
    } else if (error.message === 'Usuário não encontrado') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
        },
      });
    } else if (error.message === 'Conta desativada') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Conta desativada',
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
      });
    }
  }
};