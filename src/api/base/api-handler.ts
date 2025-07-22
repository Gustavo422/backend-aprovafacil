import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { ValidationError, NotFoundError, DatabaseError, AppError } from '../../core/errors/index.js';
import { performance } from 'perf_hooks';

/**
 * Métodos HTTP suportados
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Contexto da requisição
 */
export interface RequestContext {
  /**
   * ID único da requisição
   */
  requestId: string;
  
  /**
   * Usuário autenticado (se houver)
   */
  user?: {
    id: string;
    email: string;
    role: string;
  };
  
  /**
   * IP do cliente
   */
  clientIp: string;
  
  /**
   * User Agent
   */
  userAgent: string;
  
  /**
   * Timestamp da requisição
   */
  timestamp: Date;
  
  /**
   * Logger com contexto
   */
  logger: EnhancedLogger;
}

/**
 * Opções do handler
 */
export interface ApiHandlerOptions {
  /**
   * Se requer autenticação
   */
  requireAuth?: boolean;
  
  /**
   * Roles permitidas
   */
  allowedRoles?: string[];
  
  /**
   * Schema de validação para o body
   */
  bodySchema?: z.ZodSchema;
  
  /**
   * Schema de validação para query parameters
   */
  querySchema?: z.ZodSchema;
  
  /**
   * Schema de validação para path parameters
   */
  paramsSchema?: z.ZodSchema;
  
  /**
   * Rate limiting (requests por minuto)
   */
  rateLimit?: number;
  
  /**
   * Timeout em milissegundos
   */
  timeout?: number;
}

/**
 * Função handler da API
 */
export type ApiHandlerFunction<T = unknown, P = unknown> = (
  request: NextRequest,
  context: RequestContext,
  params?: P
) => Promise<T>;

/**
 * Resposta padronizada da API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  meta?: {
    requestId: string;
    timestamp: string;
    executionTime: number;
  };
}

/**
 * Cache simples para rate limiting
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>();
  
  isAllowed(key: string, limit: number, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = this.cache.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.cache.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

const rateLimitCache = new RateLimitCache();

// Cleanup do cache a cada 5 minutos
setInterval(() => rateLimitCache.cleanup(), 5 * 60 * 1000);

/**
 * Criar handler de API com validação e tratamento de erros
 */
export function createApiHandler<
  T = unknown,
  P = unknown
>(
  handlers: Partial<Record<HttpMethod, ApiHandlerFunction<T, P>>>,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest, { params }: { params?: P } = {}) => {
    const startTime = performance.now();
    const requestId = generateRequestId();
    const method = request.method as HttpMethod;
    
    // Logger com contexto
    const logger = getEnhancedLogger('api-handler').child({
      requestId,
      method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    try {
      logger.info('Processando requisição API', {
        method,
        url: request.url,
        hasBody: request.headers.get('content-length') !== '0'
      });
      
      // Verificar se o método é suportado
      const handler = handlers[method];
      if (!handler) {
        return createErrorResponse(
          405,
          'METHOD_NOT_ALLOWED',
          `Método ${method} não permitido`,
          requestId,
          performance.now() - startTime
        );
      }
      
      // Obter IP do cliente
      const clientIp = getClientIp(request);
      
      // Rate limiting
      if (options.rateLimit) {
        const rateLimitKey = `${clientIp}:${request.nextUrl.pathname}`;
        if (!rateLimitCache.isAllowed(rateLimitKey, options.rateLimit)) {
          logger.warn('Rate limit excedido', { clientIp, rateLimit: options.rateLimit });
          return createErrorResponse(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Muitas requisições. Tente novamente em alguns minutos.',
            requestId,
            performance.now() - startTime
          );
        }
      }
      
      // Criar contexto da requisição
      const context: RequestContext = {
        requestId,
        clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        logger
      };
      
      // Autenticação
      if (options.requireAuth) {
        const authResult = await authenticateRequest(request, logger);
        if (!authResult.success) {
          return createErrorResponse(
            401,
            'UNAUTHORIZED',
            authResult.error || 'Não autorizado',
            requestId,
            performance.now() - startTime
          );
        }
        
        context.user = authResult.user;
        
        // Verificar roles
        if (options.allowedRoles && !options.allowedRoles.includes(authResult.user!.role)) {
          logger.warn('Acesso negado por role', { 
            userRole: authResult.user!.role, 
            allowedRoles: options.allowedRoles 
          });
          return createErrorResponse(
            403,
            'FORBIDDEN',
            'Acesso negado',
            requestId,
            performance.now() - startTime
          );
        }
      }
      
      // Validação do body
      let validatedBody;
      if (options.bodySchema && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        try {
          const body = await request.json();
          validatedBody = options.bodySchema.parse(body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return createErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Dados inválidos',
              requestId,
              performance.now() - startTime,
              error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            );
          }
          throw error;
        }
      }
      
      // Validação dos query parameters
      let validatedQuery;
      if (options.querySchema) {
        try {
          const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
          validatedQuery = options.querySchema.parse(searchParams);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return createErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Parâmetros de consulta inválidos',
              requestId,
              performance.now() - startTime,
              error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            );
          }
          throw error;
        }
      }
      
      // Validação dos path parameters
      let validatedParams;
      if (options.paramsSchema && params) {
        try {
          validatedParams = options.paramsSchema.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return createErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Parâmetros de rota inválidos',
              requestId,
              performance.now() - startTime,
              error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            );
          }
          throw error;
        }
      }
      
      // Timeout
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          throw new Error('Request timeout');
        }, options.timeout);
      }
      
      try {
        // Executar handler
        const result = await handler(request, context, {
          body: validatedBody as unknown,
          query: validatedQuery as unknown,
          params: validatedParams as unknown
        } as P);
        
        const executionTime = performance.now() - startTime;
        
        logger.info('Requisição processada com sucesso', {
          executionTimeMs: executionTime.toFixed(2),
          statusCode: 200
        });
        
        return NextResponse.json(createSuccessResponse(
          result,
          'Operação realizada com sucesso',
          requestId,
          executionTime
        ));
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      logger.error('Erro no processamento da requisição', {
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime.toFixed(2)
      }, error instanceof Error ? error : undefined);
      
      // Tratar diferentes tipos de erro
      if (error instanceof ValidationError) {
        return createErrorResponse(
          400,
          'VALIDATION_ERROR',
          error.message,
          requestId,
          executionTime,
          error.errors
        );
      }
      
      if (error instanceof NotFoundError) {
        return createErrorResponse(
          404,
          'NOT_FOUND',
          error.message,
          requestId,
          executionTime
        );
      }
      
      if (error instanceof AppError) {
        return createErrorResponse(
          error.statusCode,
          error.code || 'APP_ERROR',
          error.message,
          requestId,
          executionTime
        );
      }
      
      if (error instanceof DatabaseError) {
        return createErrorResponse(
          500,
          'DATABASE_ERROR',
          'Erro interno do servidor',
          requestId,
          executionTime
        );
      }
      
      // Erro genérico
      return createErrorResponse(
        500,
        'INTERNAL_ERROR',
        'Erro interno do servidor',
        requestId,
        executionTime
      );
    }
  };
}

/**
 * Gerar ID único para a requisição
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Obter IP do cliente
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Autenticar requisição
 */
async function authenticateRequest(request: NextRequest, logger: EnhancedLogger): Promise<{
  success: boolean;
  user?: { id: string; email: string; role: string };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token de autorização não fornecido' };
    }
    
    const token = authHeader.substring(7);
    
    // Aqui você implementaria a validação do token
    // Por exemplo, usando JWT ou validando com Supabase
    
    // Simulação - substitua pela implementação real
    if (token === 'invalid') {
      return { success: false, error: 'Token inválido' };
    }
    
    // Retornar usuário simulado - substitua pela implementação real
    return {
      success: true,
      user: {
        id: 'user_123',
        email: 'user@example.com',
        role: 'user'
      }
    };
  } catch (error) {
    logger.error('Erro na autenticação', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Erro na validação do token' };
  }
}

/**
 * Criar resposta de sucesso
 */
function createSuccessResponse<T>(
  data: T,
  message: string,
  requestId: string,
  executionTime: number
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: Math.round(executionTime * 100) / 100
    }
  };
}

/**
 * Criar resposta de erro
 */
function createErrorResponse(
  statusCode: number,
  errorCode: string,
  message: string,
  requestId: string,
  executionTime: number,
  errors?: string[]
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: errorCode,
    message,
    errors,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: Math.round(executionTime * 100) / 100
    }
  };
  
  return NextResponse.json(response, { status: statusCode });
}