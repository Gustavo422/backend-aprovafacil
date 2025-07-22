import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { createClient } from '@supabase/supabase-js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service';

/**
 * POST /api/auth/refresh - Refresh access token
 */
export async function POST(request: NextRequest) {
  const logger = getEnhancedLogger('auth-refresh');
  
  try {
    logger.debug('Iniciando refresh de token');
    
    // Parse request body
    const body = await request.json();
    const { refreshToken } = body;
    
    if (!refreshToken) {
      logger.warn('Refresh token não fornecido');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token não fornecido',
          code: 'MISSING_REFRESH_TOKEN'
        },
        { status: 400 }
      );
    }
    
    // Initialize dependencies
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const authService = new EnhancedAuthService(supabase as ReturnType<typeof createClient>, {
      jwtSecret: process.env.JWT_SECRET!,
          accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10), // 30 dias
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10) // 90 dias
    });
    
    // Refresh token - EnhancedAuthService tem método diferente
    const tokenValidation = await authService.validateAccessToken(refreshToken);
    
    if (!tokenValidation.valid || !tokenValidation.user) {
      logger.warn('Refresh token inválido');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token inválido ou expirado',
          code: 'INVALID_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    }
    
    // Gerar novo access token
    const newAccessToken = await authService.gerarToken(tokenValidation.user);
    
    logger.info('Token refreshed successfully', { userId: tokenValidation.user.id });
    
    // Return new access token
    return NextResponse.json({
      success: true,
      data: {
        token: newAccessToken,
        usuario: tokenValidation.user
      }
    });
  } catch (error) {
    logger.error('Error refreshing token', { error: error.message });
    
    // Determine appropriate error response
    if (error.message === 'Refresh token inválido' || error.message === 'Token inválido: não é um refresh token') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token inválido',
          code: 'INVALID_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    } else if (error.message === 'Refresh token expirado') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token expirado, faça login novamente',
          code: 'EXPIRED_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    } else if (error.message === 'Usuário não encontrado') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        },
        { status: 401 }
      );
    } else if (error.message === 'Conta desativada') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Conta desativada',
          code: 'ACCOUNT_DISABLED'
        },
        { status: 401 }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro interno ao renovar token',
          code: 'REFRESH_ERROR'
        },
        { status: 500 }
      );
    }
  }
}