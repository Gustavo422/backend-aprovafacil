import debug from 'debug';
import { Request, Response, NextFunction } from 'express';

// Configurar namespaces de debug
const debugSupabase = debug('app:supabase');
const debugFrontend = debug('app:frontend');
const debugBackend = debug('app:backend');

export interface DebugContext {
  requestId: string;
  method: string;
  url: string;
  statusCode?: number;
  duration?: number;
  timestamp: string;
}

export interface SupabaseDebugInfo {
  endpoint: string;
  method: string;
  params?: any;
  headers?: any;
  payload?: any;
  response?: any;
  error?: any;
  duration: number;
}

export interface FrontendDebugInfo {
  route: string;
  method: string;
  payload?: any;
  response?: any;
  error?: any;
  duration: number;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private isDebugMode: boolean = false;

  private constructor() {
    // Verificar se está em modo debug
    this.isDebugMode = process.env.NODE_ENV === 'development' && 
                      (process.env.DEBUG === 'true' || process.env.DEBUG === 'app:*' || process.argv.includes('--debug'));
    
    // Se estiver em modo debug, habilitar os logs
    if (this.isDebugMode) {
      process.env.DEBUG = 'app:*';
      debug.enable('app:*');
    }
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public enableDebugMode(): void {
    this.isDebugMode = true;
    process.env.DEBUG = 'app:*';
    debug.enable('app:*');
  }

  public disableDebugMode(): void {
    this.isDebugMode = false;
    debug.disable();
  }

  public logSupabaseRequest(info: SupabaseDebugInfo): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'SUPABASE_REQUEST',
      timestamp: new Date().toISOString(),
      endpoint: info.endpoint,
      method: info.method,
      params: info.params,
      headers: this.sanitizeHeaders(info.headers),
      payload: this.sanitizePayload(info.payload),
      duration: `${info.duration}ms`,
    };

    debugSupabase('🚀 Supabase Request:', JSON.stringify(logData, null, 2));
  }

  public logSupabaseResponse(info: SupabaseDebugInfo): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'SUPABASE_RESPONSE',
      timestamp: new Date().toISOString(),
      endpoint: info.endpoint,
      method: info.method,
      response: this.sanitizeResponse(info.response),
      error: info.error,
      duration: `${info.duration}ms`,
    };

    if (info.error) {
      debugSupabase('❌ Supabase Error:', JSON.stringify(logData, null, 2));
    } else {
      debugSupabase('✅ Supabase Response:', JSON.stringify(logData, null, 2));
    }
  }

  public logFrontendRequest(info: FrontendDebugInfo): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'FRONTEND_REQUEST',
      timestamp: new Date().toISOString(),
      route: info.route,
      method: info.method,
      payload: this.sanitizePayload(info.payload),
      duration: `${info.duration}ms`,
    };

    debugFrontend('📤 Frontend Request:', JSON.stringify(logData, null, 2));
  }

  public logFrontendResponse(info: FrontendDebugInfo): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'FRONTEND_RESPONSE',
      timestamp: new Date().toISOString(),
      route: info.route,
      method: info.method,
      response: this.sanitizeResponse(info.response),
      error: info.error,
      duration: `${info.duration}ms`,
    };

    if (info.error) {
      debugFrontend('❌ Frontend Error:', JSON.stringify(logData, null, 2));
    } else {
      debugFrontend('📥 Frontend Response:', JSON.stringify(logData, null, 2));
    }
  }

  public logBackendRequest(context: DebugContext): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'BACKEND_REQUEST',
      ...context,
    };

    debugBackend('🔄 Backend Request:', JSON.stringify(logData, null, 2));
  }

  public logBackendResponse(context: DebugContext & { statusCode: number }): void {
    if (!this.isDebugMode) return;

    const logData = {
      type: 'BACKEND_RESPONSE',
      ...context,
    };

    const emoji = context.statusCode >= 500 ? '💥' : 
      context.statusCode >= 400 ? '⚠️' : '✅';

    debugBackend(`${emoji} Backend Response:`, JSON.stringify(logData, null, 2));
  }

  private sanitizeHeaders(headers?: any): any {
    if (!headers) return undefined;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        const value = sanitized[header];
        if (typeof value === 'string' && value.length > 8) {
          // Para tokens, mostrar apenas primeiros 4 e últimos 4 caracteres
          sanitized[header] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
        } else {
          sanitized[header] = '[REDACTED]';
        }
      }
    });
    
    return sanitized;
  }

  private sanitizePayload(payload?: any): any {
    if (!payload) return undefined;
    
    // Remover campos sensíveis
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = JSON.parse(JSON.stringify(payload));
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          if (typeof value === 'string' && value.length > 8) {
            // Para tokens, mostrar apenas primeiros 4 e últimos 4 caracteres
            result[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
          } else {
            result[key] = '[REDACTED]';
          }
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    };
    
    return sanitizeObject(sanitized);
  }

  private sanitizeResponse(response?: any): any {
    if (!response) return undefined;
    
    // Para respostas do Supabase, mostrar estrutura mas limitar dados
    if (response.data && Array.isArray(response.data)) {
      return {
        count: response.data.length,
        sample: response.data.slice(0, 3), // Mostrar apenas 3 primeiros registros
        structure: this.getDataStructure(response.data[0]),
      };
    }
    
    return this.sanitizePayload(response);
  }

  private getDataStructure(obj: any): any {
    if (!obj || typeof obj !== 'object') return typeof obj;
    
    const structure: any = {};
    for (const [key, value] of Object.entries(obj)) {
      structure[key] = typeof value;
    }
    return structure;
  }
}

// Middleware para interceptar requisições HTTP
export function debugRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = DebugLogger.getInstance();
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Adicionar request ID ao request
  req.headers['x-request-id'] = requestId;

  const context: DebugContext = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
  };

  logger.logBackendRequest(context);

  // Interceptar resposta
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    
    logger.logBackendResponse({
      ...context,
      statusCode: res.statusCode,
      duration,
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

// Wrapper para interceptar chamadas do Supabase
export function createSupabaseDebugWrapper(supabaseClient: any) {
  const logger = DebugLogger.getInstance();
  
  return new Proxy(supabaseClient, {
    get(target, prop) {
      const value = target[prop];
      
      if (typeof value === 'function') {
        return function (...args: any[]) {
          const startTime = Date.now();
          const method = prop as string;
          
          // Log da requisição
          logger.logSupabaseRequest({
            endpoint: method,
            method: 'SUPABASE',
            params: args,
            duration: 0,
          });

          try {
            const result = value.apply(target, args);
            
            if (result && typeof result.then === 'function') {
              // É uma Promise
              return result.then((response: any) => {
                const duration = Date.now() - startTime;
                
                logger.logSupabaseResponse({
                  endpoint: method,
                  method: 'SUPABASE',
                  response,
                  duration,
                });
                
                return response;
              }).catch((error: any) => {
                const duration = Date.now() - startTime;
                
                logger.logSupabaseResponse({
                  endpoint: method,
                  method: 'SUPABASE',
                  error,
                  duration,
                });
                
                throw error;
              });
            } else {
              // Não é uma Promise
              const duration = Date.now() - startTime;
              
              logger.logSupabaseResponse({
                endpoint: method,
                method: 'SUPABASE',
                response: result,
                duration,
              });
              
              return result;
            }
          } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.logSupabaseResponse({
              endpoint: method,
              method: 'SUPABASE',
              error,
              duration,
            });
            
            throw error;
          }
        };
      }
      
      return value;
    },
  });
}

export default DebugLogger; 