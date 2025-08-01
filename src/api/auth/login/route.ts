import { Request, Response } from 'express';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';
import { z } from 'zod';

// Define validation schema for login request
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
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
export const loginHandler = async (req: Request, res: Response) => {
  const authLogger = logger;
  
  try {
    authLogger.debug('Iniciando processo de login');
    
    // Parse request body
    const body = req.body;
    
    // Validate request data
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      authLogger.warn('Dados de login inválidos', { 
        errors: validationResult.error.format(), 
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: validationResult.error.format(),
        },
      });
    }
    
    const { email, senha } = validationResult.data;
    authLogger.debug('Dados validados, tentando autenticar usuário', { email });
    
    // Initialize dependencies

    const authService = new EnhancedAuthService(supabase, {
      jwtSecret: process.env.JWT_SECRET || '',
      accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '2592000', 10), // 30 dias
      refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '7776000', 10), // 90 dias
    });
    
    // Authenticate user
    const result = await authService.login({
      email,
      password: senha,
      ipAddress: Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    if (result.success && result.user && result.accessToken) {
      authLogger.info('Login bem-sucedido', { usuarioId: result.user.id });
      
      // Set secure HTTP-only cookie for access token
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.expiresIn || 2592000, // 30 dias por padrão
        path: '/',
      });
      
      return res.json({
        success: true,
        data: {
          usuario: result.user,
          token: result.accessToken,
          expiresIn: result.expiresIn,
        },
      });
    } else {
      authLogger.warn('Falha no login', { error: result.error });
      return res.status(401).json({
        success: false,
        error: {
          code: result.errorCode || 'LOGIN_FAILED',
          message: result.error || 'Falha na autenticação',
        },
      });
    }
  } catch (error) {
    authLogger.error('Erro no processo de login', { error: error instanceof Error ? error.message : String(error) });
    
    // Determine appropriate error response
    if (error instanceof Error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Email ou senha incorretos',
          },
        });
      } else if (error.message === 'Senha inválida') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Email ou senha incorretos',
          },
        });
      } else if (error.message === 'Conta desativada. Entre em contato com o suporte.') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Conta desativada. Entre em contato com o suporte.',
          },
        });
      } else if (error.message === 'Email e senha são obrigatórios') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email e senha são obrigatórios',
          },
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor. Tente novamente mais tarde.',
      },
    });
  }
};