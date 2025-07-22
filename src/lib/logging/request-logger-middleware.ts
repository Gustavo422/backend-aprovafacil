import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EnhancedLogger, getEnhancedLogger } from './enhanced-logging-service';

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
    skip: (_req) => false,
    ...options
  };
  
  return (_req: Request, res: Response, next: NextFunction) => {
    // Skip logging if needed
    if (opts.skip(_req)) {
      return next();
    }
    
    // Generate request ID if not present
    const requestId = (_req.headers['x-request-id'] as string) || uuidv4();
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);
    
    // Get start time
    const startTime = Date.now();
    
    // Create request context
    const context = {
      requestId,
      method: _req.method,
      url: _req.originalUrl || _req.url,
      ip: _req.ip || _req.socket.remoteAddress,
    };
    
    // Add headers if enabled
    if (opts.logHeaders) {
      const headers = { ..._req.headers };
      
      // Remove excluded headers
      for (const header of opts.excludeHeaders) {
        delete headers[header];
      }
      
      Object.assign(context, { headers });
    }
    
    // Add body if enabled
    if (opts.logBody && _req.body) {
      Object.assign(context, { body: _req.body });
    }
    
    // Log request
    opts.logger.info(`${_req.method} ${_req.originalUrl || _req.url}`, context);
    
    // Capture response
    const originalEnd = res.end;
    const originalWrite = res.write;
    const chunks: Buffer[] = [];
    
    if (opts.logResponseBody) {
      // Override write method to capture response body
      res.write = function(chunk: Buffer | string, ...args: unknown[]): boolean {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return originalWrite.apply(res, [chunk, ...args]);
      } as typeof res.write;
    }
    
    // Override end method to log response
    res.end = function(chunk?: Buffer | string, ...args: unknown[]): unknown {
      // Restore original methods
      res.write = originalWrite;
      res.end = originalEnd;
      
      // Capture final chunk if any
      if (chunk && opts.logResponseBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Create response context
      const responseContext = {
        requestId,
        method: _req.method,
        url: _req.originalUrl || _req.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        responseTime,
      };
      
      // Add response body if enabled
      if (opts.logResponseBody && chunks.length > 0) {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          
          // Try to parse as JSON
          try {
            const json = JSON.parse(body);
            Object.assign(responseContext, { responseBody: json });
          } catch {
            // Not JSON, use as string
            Object.assign(responseContext, { responseBody: body });
          }
        } catch {
          const msg = 'Unknown error';
          Object.assign(responseContext, { responseBodyError: msg });
        }
      }
      
      // Log response
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      opts.logger[logLevel](
        `${_req.method} ${_req.originalUrl || _req.url} ${res.statusCode} ${responseTime}ms`,
        responseContext,
      );
      
      // Call original end method
      return originalEnd.apply(res, [chunk, ...args]);
    } as typeof res.end;
    
    next();
  };
}