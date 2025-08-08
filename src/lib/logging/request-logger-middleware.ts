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
    excludeHeaders: ['authorization', 'cookie', 'set-cookie'],
    skip: () => false,
    ...options,
  };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging if needed
    if (opts.skip(req)) {
      return next();
    }
    
    // Generate request ID if not present
    const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);
    
    // Get start time
    const startTime = Date.now();
    
    // Create request context
    const context = {
      requestId,
      method: req.method,
      url: req.originalUrl ?? req.url,
      ip: req.ip ?? req.socket.remoteAddress,
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
    
    // Log request
    opts.logger.info(`${req.method} ${req.originalUrl ?? req.url}`, context);
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: unknown, encoding?: BufferEncoding | (() => void)) {
      const responseTime = Date.now() - startTime;
      
      // Create response context
      const responseContext = {
        ...context,
        statusCode: res.statusCode,
        responseTime,
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
      
      // Log response
      if (res.statusCode >= 400) {
        opts.logger.error(`${req.method} ${req.originalUrl ?? req.url} - ${res.statusCode}`, responseContext);
      } else {
        opts.logger.info(`${req.method} ${req.originalUrl ?? req.url} - ${res.statusCode}`, responseContext);
      }
      
      // Call original end (normalizando parâmetros)
      if (typeof encoding === 'function') {
        return (originalEnd as unknown as (chunk?: unknown, cb?: () => void) => Response).call(this, chunk, encoding as () => void);
      }
      return (originalEnd as unknown as (chunk?: unknown, encoding?: BufferEncoding) => Response).call(this, chunk, encoding as BufferEncoding | undefined);
    };
    
    next();
  };
}