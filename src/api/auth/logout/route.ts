import { Request, Response } from 'express';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

/**
 * POST /api/auth/logout - User logout endpoint
 * 
 * This endpoint handles user logout by invalidating the user's session
 * and clearing authentication cookies.
 * 
 * Rate limiting is applied but with a more lenient limit than login:
 * - 20 attempts per 15 minutes per IP address
 */
export const logoutHandler = async (req: Request, res: Response) => {
  const authLogger = logger;
  
  try {
    authLogger.debug('Iniciando processo de logout');
    
    // Extract token from Authorization header or cookies
    let token: string | undefined;
    let usuarioId: string | undefined;
    
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
    
    // If no token found, still proceed but log warning
    if (!token) {
      authLogger.warn('Token não fornecido para logout');
    } else {
      // Initialize dependencies

      const authService = new EnhancedAuthService(supabase, {
        jwtSecret: process.env.JWT_SECRET || '',
        accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10),
        refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10),
      });
      
      try {
        // Try to validate token to get user ID
        const tokenData = await authService.validateAccessToken(token);
        if (tokenData.valid && tokenData.user) {
          usuarioId = tokenData.user.id;
        }
        
        // Invalidate the session
        await authService.logout(usuarioId, token);
        authLogger.info('Sessão invalidada com sucesso', { usuarioId });
      } catch (error) {
        // If token validation fails, just log and continue with logout
        authLogger.warn('Falha ao validar token durante logout', { error: error.message });
      }
    }
    
    // Clear authentication cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    return res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    authLogger.error('Erro no processo de logout', { error: error.message });
    
    // Return success even if there was an error to ensure client side logout
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    return res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  }
};