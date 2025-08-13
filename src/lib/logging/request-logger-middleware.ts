import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { EnhancedLogger} from './enhanced-logging-service.js';
import { getEnhancedLogger } from './enhanced-logging-service.js';

/**
 * Request logger options
 */
export interface RequestLoggerOptions {
  /**
   * Logger instance
   */
  logger?: EnhancedLogger;
  
  /**
   * Whether to log request body
   */
  logBody?: boolean;
  
  /**
   * Whether to log request headers
   */
  logHeaders?: boolean;
  
  /**
   * Whether to log response body
   */
  logResponseBody?: boolean;
  
  /**
   * Whether to log response time
   */
  logResponseTime?: boolean;
  
  /**
   * Headers to exclude from logging
   */
  excludeHeaders?: string[];
  
  /**
   * Skip logging for certain requests
   */
  skip?: (req: Request) => boolean;

  /**
   * Sampling rate for info logs (0.0 - 1.0). Errors (>=400) are always logged.
   * Defaults to env LOG_SAMPLING_RATE or 1.0
   */
  sampleRate?: number;
}

/**
 * Create request logger middleware
 * @param options Request logger options
 * @returns Express middleware
 */
export function createRequestLoggerMiddleware(options: RequestLoggerOptions = {}) {
  // Set default options
  const opts: Required<RequestLoggerOptions> = {
    logger: getEnhancedLogger('http'),
    logBody: false,
    logHeaders: false,
    logResponseBody: false,
    logResponseTime: true,
    excludeHeaders: ['authorization', 'cookie', 'set-cookie', 'x-supabase-api-key', 'x-api-key'],
    skip: () => false,
    sampleRate: Number.isFinite(parseFloat(process.env.LOG_SAMPLING_RATE ?? '1'))
      ? Math.max(0, Math.min(1, parseFloat(process.env.LOG_SAMPLING_RATE ?? '1')))
      : 1,
    ...options,
  };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging if needed
    if (opts.skip(req)) {
      return next();
    }
    
    // Generate request ID if not present
    const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
    // Correlation id propagada do frontend, se houver
    const correlationId = req.get('x-correlation-id') ?? undefined;
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);
    if (correlationId) res.setHeader('x-correlation-id', correlationId);
    
    // Get start time
    const startTime = Date.now();
    
    // Recognize feature by URL (sanitize URL: drop query string to avoid PII leakage)
    const rawUrl = (req.originalUrl ?? req.url ?? '');
    const [safePath] = rawUrl.split('?');
    const urlPath = safePath ?? '';
    const feature = urlPath.startsWith('/api/v1/simulados') || urlPath.startsWith('/api/simulados')
      ? 'simulados'
      : undefined;
    if (feature && !res.getHeader('x-feature')) res.setHeader('x-feature', feature);

    // Create request context
    const context = {
      requestId,
      correlationId,
      method: req.method,
      url: urlPath,
      ip: req.ip ?? req.socket.remoteAddress,
      usuarioId: (req as unknown as { user?: { id?: string } }).user?.id,
      feature,
    };
    
    // Add headers if enabled
    if (opts.logHeaders) {
      const headers = { ...req.headers };
      
      // Remove excluded headers
      for (const header of opts.excludeHeaders) {
        delete headers[header];
      }
      
      Object.assign(context, { headers });
    }
    
    // Add body if enabled
    if (opts.logBody && req.body) {
      Object.assign(context, { body: req.body });
    }
    
    // Decide sampling for info logs (errors always logged)
    const shouldLogInfo = Math.random() < (opts.sampleRate ?? 1);

    // Log request (sampled)
    if (shouldLogInfo) {
      opts.logger.info(`${req.method} ${urlPath}`, context);
    }
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: unknown, encoding?: BufferEncoding | (() => void)) {
      const responseTime = Date.now() - startTime;
      
      // Create response context
      const responseContext = {
        ...context,
        statusCode: res.statusCode,
        responseTime,
        durationMs: responseTime,
      };
      
      // Add response body if enabled
      if (opts.logResponseBody && chunk) {
        try {
          const responseBody = typeof chunk === 'string' ? chunk : chunk.toString();
          Object.assign(responseContext, { responseBody });
        } catch {
          // Ignore errors parsing response body
        }
      }
      
      // Attach server duration header
      try { res.setHeader('X-Server-Duration', String(responseTime)); } catch {}

      // Log response
      if (res.statusCode >= 400) {
        opts.logger.error(`${req.method} ${urlPath} - ${res.statusCode}`, responseContext);
      } else if (shouldLogInfo) {
        opts.logger.info(`${req.method} ${urlPath} - ${res.statusCode}`, responseContext);
      }
      
      // Call original end (normalizando parâmetros)
      if (typeof encoding === 'function') {
        return (originalEnd as unknown as (chunk?: unknown, cb?: () => void) => Response).call(this, chunk, encoding as () => void);
      }
      return (originalEnd as unknown as (chunk?: unknown, encoding?: BufferEncoding) => Response).call(this, chunk, encoding);
    };
    
    next();
  };
}