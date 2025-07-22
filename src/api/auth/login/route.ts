import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service';
import { withRateLimit } from '../../../middleware/rate-limiter';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Define validation schema for login request
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória')
});

/**
 * POST /api/auth/login - User authentication endpoint
 * 
 * This endpoint handles user authentication by validating credentials
 * and returning JWT tokens for successful logins.
 * 
 * Rate limiting is applied to prevent brute force attacks:
 * - 5 attempts per 15 minutes per IP address
 */
async function handler(request: NextRequest) {
  const logger = getEnhancedLogger('auth-login');
  
  try {
    logger.debug('Iniciando processo de login');
    
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Dados de login inválidos', { 
        errors: validationResult.error.format() 
      });
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: validationResult.error.format()
          }
        },
        { status: 400 }
      );
    }
    
    const { email, senha } = validationResult.data;
    logger.debug('Dados validados, tentando autenticar usuário', { email });
    
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
    
    // Authenticate user
    const result = await authService.login({
      email,
      password: senha,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    if (result.success && result.user && result.accessToken) {
      logger.info('Login bem-sucedido', { userId: result.user.id });
      
      // Set HTTP-only cookie with access token
      const response = NextResponse.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      });
      
      // Set secure HTTP-only cookie for access token
      response.cookies.set({
        name: 'accessToken',
        value: result.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.expiresIn || 3600, // Use the service's expiry time
        path: '/'
      });
      
      return response;
    } else {
      logger.warn('Falha no login', { error: result.error });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.errorCode || 'LOGIN_FAILED',
            message: result.error || 'Falha na autenticação'
          }
        },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Erro no processo de login', { error: error.message });
    
    // Determine appropriate error response
    if (error.message === 'Usuário não encontrado') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Email ou senha incorretos'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Senha inválida') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Email ou senha incorretos'
          }
        },
        { status: 401 }
      );
    } else if (error.message === 'Conta desativada. Entre em contato com o suporte.') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Conta desativada. Entre em contato com o suporte.'
          }
        },
        { status: 403 }
      );
    } else if (error.message === 'Email e senha são obrigatórios') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email e senha são obrigatórios'
          }
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor. Tente novamente mais tarde.'
          }
        },
        { status: 500 }
      );
    }
  }
}

// Apply rate limiting to the login endpoint
export const POST = withRateLimit(handler);