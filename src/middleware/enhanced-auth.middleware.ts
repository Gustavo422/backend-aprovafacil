import { Request, Response, NextFunction } from 'express';
import { EnhancedAuthService } from '../auth/enhanced-auth.service.js';
import { EnhancedLogger, getEnhancedLogger } from '../lib/logging/enhanced-logging-service.js';
import { createClient } from '@supabase/supabase-js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome?: string;
    ativo?: boolean;
    primeiro_login?: boolean;
    is_admin?: boolean;
  };
  session?: {
    id: string;
    deviceInfo?: Record<string, unknown>;
    ipAddress?: string;
    lastActivity: Date;
  };
  authToken?: string;
}

interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  requireActive?: boolean;
  allowFirstLogin?: boolean;
  refreshTokens?: boolean;
  logActivity?: boolean;
  rateLimitByUser?: number; // requests per minute
}

export class EnhancedAuthMiddleware {
  private authService: EnhancedAuthService;
  private logger: EnhancedLogger;
  private userRequestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(supabaseClient: ReturnType<typeof createClient>, jwtSecret: string) {
    this.authService = new EnhancedAuthService(supabaseClient, { jwtSecret });
    this.logger = getEnhancedLogger('auth-middleware');
  }

  /**
   * Middleware principal de autenticação
   */
  authenticate(options: AuthMiddlewareOptions = {}) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      const ipAddress = this.extractClientIP(req);
      const userAgent = req.get('User-Agent');

      try {
        this.logger.debug('Iniciando autenticação', {
          requestId,
          method: req.method,
          path: req.path,
          ipAddress,
          userAgent
        });

        // Se autenticação não for obrigatória, pular verificação
        if (!options.requireAuth) {
          return next();
        }

        // Extrair token
        const token = this.extractToken(req);
        if (!token) {
          return this.sendAuthError(res, 'Token de autorização necessário', 'MISSING_TOKEN', 401);
        }

        // Validar token
        const tokenValidation = await this.authService.validateAccessToken(token);
        if (!tokenValidation.valid) {
          // Tentar refresh se token expirou
          if (options.refreshTokens && tokenValidation.error === 'Token expirado') {
            const refreshResult = await this.handleTokenRefresh(req, res, ipAddress, userAgent);
            if (refreshResult.success) {
              req.user = refreshResult.user;
              req.authToken = refreshResult.newToken;
            } else {
              return this.sendAuthError(res, 'Token expirado. Faça login novamente', 'TOKEN_EXPIRED', 401);
            }
          } else {
            return this.sendAuthError(res, tokenValidation.error || 'Token inválido', 'INVALID_TOKEN', 401);
          }
        } else {
          req.user = tokenValidation.user;
          req.authToken = token;
        }

        // Verificações adicionais
        const validationError = await this.performAdditionalValidations(req.user!, options);
        if (validationError) {
          return this.sendAuthError(res, validationError.message, validationError.code, validationError.status);
        }

        // Rate limiting por usuário
        if (options.rateLimitByUser) {
          const rateLimitError = this.checkUserRateLimit(req.user!.id, options.rateLimitByUser);
          if (rateLimitError) {
            return this.sendAuthError(res, rateLimitError, 'RATE_LIMIT_EXCEEDED', 429);
          }
        }

        // Carregar informações da sessão
        if (options.logActivity) {
          await this.loadSessionInfo(req, ipAddress);
        }

        const executionTime = Date.now() - startTime;
        this.logger.info('Autenticação bem-sucedida', {
          requestId,
          userId: req.user!.id,
          method: req.method,
          path: req.path,
          executionTimeMs: executionTime
        });

        next();

      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error('Erro na autenticação', {
          requestId,
          error: error.message,
          method: req.method,
          path: req.path,
          executionTimeMs: executionTime
        });

        return this.sendAuthError(res, 'Erro interno de autenticação', 'INTERNAL_ERROR', 500);
      }
    };
  }

  /**
   * Middleware para roles específicas
   */
  requireRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return this.authenticate({
      requireAuth: true,
      allowedRoles,
      requireActive: true,
      allowFirstLogin: false
    });
  }

  /**
   * Middleware para administradores
   */
  requireAdmin() {
    return this.requireRole(['admin']);
  }

  /**
   * Middleware para usuários ativos
   */
  requireActiveUser() {
    return this.authenticate({
      requireAuth: true,
      requireActive: true,
      allowFirstLogin: true
    });
  }

  /**
   * Middleware com refresh automático
   */
  withAutoRefresh() {
    return this.authenticate({
      requireAuth: true,
      refreshTokens: true,
      logActivity: true
    });
  }

  // ========== MÉTODOS PRIVADOS ==========

  private extractToken(req: AuthenticatedRequest): string | null {
    // Tentar extrair do header Authorization
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Tentar extrair de cookies
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  private extractClientIP(req: Request): string {
    return (
      req.get('X-Forwarded-For')?.split(',')[0] ||
      req.get('X-Real-IP') ||
      req.ip ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  private async handleTokenRefresh(
    req: AuthenticatedRequest,
    res: Response,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; user?: { id: string; email: string; role: string; nome?: string; ativo?: boolean; primeiro_login?: boolean; is_admin?: boolean; }; newToken?: string }> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return { success: false };
      }

      const refreshResult = await this.authService.refreshToken(refreshToken, ipAddress, userAgent);
      if (refreshResult.success && refreshResult.accessToken) {
        // Atualizar cookie com novo token
        res.cookie('accessToken', refreshResult.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000 // 1 hora
        });

        return {
          success: true,
          user: refreshResult.user as { id: string; email: string; role: string; nome?: string; ativo?: boolean; primeiro_login?: boolean; is_admin?: boolean; },
          newToken: refreshResult.accessToken
        };
      }

      return { success: false };
    } catch (error) {
      this.logger.error('Erro no refresh automático', { error: error.message });
      return { success: false };
    }
  }

  private async performAdditionalValidations(
    user: { id: string; email: string; role: string; nome?: string; ativo?: boolean; primeiro_login?: boolean; is_admin?: boolean; },
    options: AuthMiddlewareOptions
  ): Promise<{ message: string; code: string; status: number } | null> {
    // Verificar se usuário está ativo
    if (options.requireActive && !user.ativo) {
      return {
        message: 'Conta desativada',
        code: 'ACCOUNT_DISABLED',
        status: 403
      };
    }

    // Verificar primeiro login
    if (!options.allowFirstLogin && user.primeiro_login) {
      return {
        message: 'Configuração inicial necessária',
        code: 'FIRST_LOGIN_REQUIRED',
        status: 403
      };
    }

    // Verificar roles
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role)) {
        return {
          message: 'Permissão insuficiente',
          code: 'INSUFFICIENT_PERMISSIONS',
          status: 403
        };
      }
    }

    return null;
  }

  private checkUserRateLimit(userId: string, limit: number): string | null {
    const now = Date.now();
    const windowMs = 60000; // 1 minuto
    
    const userStats = this.userRequestCounts.get(userId);
    
    if (!userStats || now > userStats.resetTime) {
      // Primeira requisição ou janela expirou
      this.userRequestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      return null;
    }

    if (userStats.count >= limit) {
      return `Limite de ${limit} requisições por minuto excedido`;
    }

    userStats.count++;
    return null;
  }

  private async loadSessionInfo(req: AuthenticatedRequest, ipAddress: string): Promise<void> {
    try {
      if (!req.user) return;

      const sessions = await this.authService.getUserSessions(req.user.id);
      const currentSession = sessions.find(s => s.ipAddress === ipAddress);
      
      if (currentSession) {
        req.session = {
          id: currentSession.id,
          deviceInfo: currentSession.deviceInfo,
          ipAddress: currentSession.ipAddress,
          lastActivity: currentSession.lastActivity
        };
      }
    } catch (error) {
      this.logger.error('Erro ao carregar informações da sessão', { error: error.message });
    }
  }

  private sendAuthError(res: Response, message: string, code: string, status: number): void {
    res.status(status).json({
      success: false,
      error: {
        message,
        code
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpar cache de rate limiting periodicamente
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();
    for (const [userId, stats] of this.userRequestCounts.entries()) {
      if (now > stats.resetTime) {
        this.userRequestCounts.delete(userId);
      }
    }
  }

  /**
   * Inicializar limpeza periódica
   */
  public startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupRateLimitCache();
    }, 60000); // Limpar a cada minuto
  }
}

/**
 * Função helper para criar instância do middleware
 */
export function createEnhancedAuthMiddleware(
  supabaseClient: ReturnType<typeof createClient>,
  jwtSecret: string
): EnhancedAuthMiddleware {
  const middleware = new EnhancedAuthMiddleware(supabaseClient, jwtSecret);
  middleware.startPeriodicCleanup();
  return middleware;
}

/**
 * Tipos para TypeScript
 */
export type { AuthenticatedRequest, AuthMiddlewareOptions }; 