import { Request, Response } from 'express';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { supabase } from '../../../config/supabase-unified.js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service';

/**
 * POST /api/auth/refresh - Refresh access token
 */
export const refreshHandler = async (req: Request, res: Response) => {
  const logger = getEnhancedLogger('auth-refresh');
  
  try {
    logger.debug('Iniciando refresh de token');
    
    // Parse request body
    const body = req.body;
    const { refreshToken } = body;
    
    if (!refreshToken) {
      logger.warn('Refresh token não fornecido');
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token não fornecido',
        code: 'MISSING_REFRESH_TOKEN',
      });
    }
    
    // Initialize dependencies

    const authService = new EnhancedAuthService(supabase, {
      jwtSecret: process.env.JWT_SECRET || '',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10),
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10),
    });
    
    // Refresh token - EnhancedAuthService tem método diferente
    const tokenValidation = await authService.validateAccessToken(refreshToken);
    
    if (!tokenValidation.valid || !tokenValidation.user) {
      logger.warn('Refresh token inválido');
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token inválido ou expirado',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
    
    // Gerar novo access token
    const newAccessToken = await authService.gerarToken(tokenValidation.user);
    
    logger.info('Token refreshed successfully', { usuarioId: tokenValidation.user.id });
    
    // Return new access token
    return res.json({
      success: true,
      data: {
        token: newAccessToken,
        usuario: tokenValidation.user,
      },
    });
  } catch (error) {
    logger.error('Error refreshing token', { error: error.message });
    
    // Determine appropriate error response
    if (error.message === 'Refresh token inválido' || error.message === 'Token inválido: não é um refresh token') {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN',
      });
    } else if (error.message === 'Refresh token expirado') {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token expirado, faça login novamente',
        code: 'EXPIRED_REFRESH_TOKEN',
      });
    } else if (error.message === 'Usuário não encontrado') {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND',
      });
    } else if (error.message === 'Conta desativada') {
      return res.status(401).json({ 
        success: false, 
        error: 'Conta desativada',
        code: 'ACCOUNT_DISABLED',
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao renovar token',
        code: 'REFRESH_ERROR',
      });
    }
  }
};