import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { createClient } from '@supabase/supabase-js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service';
import { withRateLimit, createRateLimiter } from '../../../middleware/rate-limiter';

// Create a more lenient rate limiter for user verification
const meRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  30 // 30 requests per window
);

/**
 * GET /api/auth/me - User verification endpoint
 * 
 * This endpoint verifies the current user's authentication status
 * and returns user information for valid tokens.
 * 
 * Rate limiting is applied but with a more lenient limit:
 * - 30 attempts per 15 minutes per IP address
 */
async function handler(request: NextRequest) {
  const logger = getEnhancedLogger('auth-me');
  
  try {
    logger.debug('Verificando usuário autenticado');
    
    // Extract token from Authorization header or cookies
    let token: string | undefined;
    
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, try to get from cookies
    if (!token) {
      const cookieToken = request.cookies.get('accessToken')?.value;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    // If no token found, return unauthorized
    if (!token) {
      logger.warn('Token de autenticação não fornecido');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_REQUIRED',
            message: 'Token de autenticação necessário'
          }
        },
        { status: 401 }
      );
    }
    
    // Initialize dependencies
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const authService = new EnhancedAuthService(supabase as ReturnType<typeof createClient>, {
      jwtSecret: process.env.JWT_SECRET!,
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '3600', 10),
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '2592000', 10)
    });
    
    // Validate token and get user information
    const tokenData = await authService.validateAccessToken(token);
    
    if (!tokenData.valid || !tokenData.user) {
      logger.warn('Token inválido ou usuário não encontrado');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido ou expirado'
          }
        },
        { status: 401 }
      );
    }
    logger.info('Token validado com sucesso', { userId: tokenData.user.id });
    
    // Return user information
    return NextResponse.json({
      success: true,
      user: {
        id: tokenData.user.id,
        email: tokenData.user.email,
        nome: tokenData.user.nome,
        role: tokenData.user.role,
        ativo: tokenData.user.ativo,
        primeiro_login: tokenData.user.primeiro_login
      }
    });
  } catch (error) {
    logger.error('Erro ao verificar autenticação', { error: error.message });
    
    // Determine appropriate error response
    if (error.message === 'Token não fornecido') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_REQUIRED',
            message: 'Token de autenticação necessário'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Token inválido') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Token expirado') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token expirado, faça login novamente'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Usuário não encontrado') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Conta desativada') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Conta desativada'
          }
        },
        { status: 403 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor'
          }
        },
        { status: 500 }
      );
    }
  }
}

// Apply rate limiting to the me endpoint
export const GET = withRateLimit(handler, meRateLimiter);