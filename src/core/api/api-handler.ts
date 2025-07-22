import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getLogger } from '../../lib/logging';
import { BaseError } from '../../lib/errors/base-error';
import { ValidationError, AuthError } from '../../lib/errors';
import { ErrorCategory } from '../../lib/errors/error-category';
import { RequestValidator } from './request-validator';
import { ResponseFormatter } from './response-formatter';
import { performance } from 'perf_hooks';

/**
 * HTTP methods supported by the API handler
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * Request context with additional information
 */
export interface RequestContext {
  /**
   * Unique request ID
   */
  requestId: string;
  
  /**
   * Authenticated user (if available)
   */
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
  
  /**
   * Client IP address
   */
  clientIp: string;
  
  /**
   * User agent string
   */
  userAgent: string;
  
  /**
   * Request timestamp
   */
  timestamp: Date;
  
  /**
   * Logger instance with request context
   */
  logger: ReturnType<typeof getLogger>;
  
  /**
   * Validated request body
   */
  body?: unknown;
  
  /**
   * Validated query parameters
   */
  query?: unknown;
  
  /**
   * Validated path parameters
   */
  params?: unknown;
}

/**
 * API handler options
 */
export interface ApiHandlerOptions {
  /**
   * Whether authentication is required
   */
  requireAuth?: boolean;
  
  /**
   * Allowed roles for the endpoint
   */
  allowedRoles?: string[];
  
  /**
   * Schema for validating request body
   */
  validateBody?: z.ZodSchema;
  
  /**
   * Schema for validating query parameters
   */
  validateQuery?: z.ZodSchema;
  
  /**
   * Schema for validating path parameters
   */
  validateParams?: z.ZodSchema;
  
  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    /**
     * Number of requests allowed in the time window
     */
    requests: number;
    
    /**
     * Time window in milliseconds
     */
    windowMs: number;
  };
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * CORS configuration
   */
  cors?: {
    /**
     * Allowed origins
     */
    origin?: string | string[];
    
    /**
     * Allowed methods
     */
    methods?: string[];
    
    /**
     * Allowed headers
     */
    headers?: string[];
    
    /**
     * Whether to allow credentials
     */
    credentials?: boolean;
  };
}

/**
 * API handler function type
 */
export type ApiHandlerFunction = (
  request: NextRequest,
  context: RequestContext
) => Promise<unknown>;

/**
 * API response interface
 */
export interface ApiResponse<T = unknown> {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Response data (for successful requests)
   */
  data?: T;
  
  /**
   * Success message (for successful requests)
   */
  message?: string;
  
  /**
   * Error code (for failed requests)
   */
  error?: {
    /**
     * Error code
     */
    code: string;
    
    /**
     * Error message
     */
    message: string;
    
    /**
     * Error details
     */
    details?: unknown;
  };
  
  /**
   * Response metadata
   */
  meta: {
    /**
     * Request ID
     */
    requestId: string;
    
    /**
     * Response timestamp
     */
    timestamp: string;
    
    /**
     * API version
     */
    version: string;
    
    /**
     * Request execution time in milliseconds
     */
    executionTime?: number;
  };
}

/**
 * Simple in-memory cache for rate limiting
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>();
  
  /**
   * Check if a request is allowed based on rate limiting
   */
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
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a singleton rate limit cache
const rateLimitCache = new RateLimitCache();

// Clean up the cache every 5 minutes
setInterval(() => rateLimitCache.cleanup(), 5 * 60 * 1000);

/**
 * Enhanced API handler with improved error handling, validation, and response formatting
 */
export class ApiHandler {
  private logger: ReturnType<typeof getLogger>;
  
  constructor(private name: string = 'api') {
    this.logger = getLogger(`ApiHandler:${name}`);
  }
  
  /**
   * Create an API route handler for Next.js App Router
   */
  createHandler(
    handlers: Partial<Record<HttpMethod, ApiHandlerFunction>>,
    options: ApiHandlerOptions = {}
  ) {
    return async (request: NextRequest, { params }: { params?: Record<string, unknown> } = {}) => {
      const startTime = performance.now();
      const requestId = this.generateRequestId();
      const method = request.method as HttpMethod;
      
      // Create logger with request context
      const requestLogger = this.logger.child({
        requestId,
        method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      
      try {
        requestLogger.info('Processing API request', {
          method,
          url: request.url,
          hasBody: request.headers.get('content-length') !== '0'
        });
        
        // Check if method is supported
        const handler = handlers[method];
        if (!handler) {
          return ResponseFormatter.error('Method not allowed', {
            status: 405,
            code: 'METHOD_NOT_ALLOWED',
            requestId,
          });
        }
        
        // Get client IP
        const clientIp = this.getClientIp(request);
        
        // Apply rate limiting if configured
        if (options.rateLimit) {
          const rateLimitKey = `${clientIp}:${request.nextUrl.pathname}`;
          if (!rateLimitCache.isAllowed(
            rateLimitKey, 
            options.rateLimit.requests, 
            options.rateLimit.windowMs
          )) {
            requestLogger.warn('Rate limit exceeded', { 
              clientIp, 
              rateLimit: options.rateLimit 
            });
            
            return ResponseFormatter.rateLimitError(
              'Too many requests. Please try again later.',
              requestId
            );
          }
        }
        
        // Create request context
        const context: RequestContext = {
          requestId,
          clientIp,
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date(),
          logger: requestLogger
        };
        
        // Handle authentication if required
        if (options.requireAuth) {
          try {
            const authResult = await this.authenticateRequest(request, requestLogger);
            context.user = authResult;
            
            // Check role-based access if roles are specified
            if (options.allowedRoles && options.allowedRoles.length > 0) {
              if (!authResult.role || !options.allowedRoles.includes(authResult.role)) {
                requestLogger.warn('Access denied due to insufficient permissions', {
                  userRole: authResult.role,
                  allowedRoles: options.allowedRoles
                });
                
                return ResponseFormatter.forbiddenError(
                  'You do not have permission to access this resource',
                  requestId
                );
              }
            }
          } catch (error) {
            if (error instanceof AuthError) {
              return ResponseFormatter.authError(error.message, requestId);
            }
            
            requestLogger.error('Authentication error', {
              error: error instanceof Error ? error.message : String(error)
            });
            
            return ResponseFormatter.authError('Authentication failed', requestId);
          }
        }
        
        // Validate request body
        if (options.validateBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          try {
            context.body = await RequestValidator.validateBody(request, options.validateBody);
          } catch (error) {
            if (error instanceof ValidationError) {
              return ResponseFormatter.validationError(
                'Invalid request body',
                error.details,
                requestId
              );
            }
            
            return ResponseFormatter.validationError(
              'Failed to parse request body',
              undefined,
              requestId
            );
          }
        }
        
        // Validate query parameters
        if (options.validateQuery) {
          try {
            context.query = RequestValidator.validateQuery(request, options.validateQuery);
          } catch (error) {
            if (error instanceof ValidationError) {
              return ResponseFormatter.validationError(
                'Invalid query parameters',
                error.details,
                requestId
              );
            }
            
            return ResponseFormatter.validationError(
              'Failed to parse query parameters',
              undefined,
              requestId
            );
          }
        }
        
        // Validate path parameters
        if (options.validateParams && params) {
          try {
            context.params = RequestValidator.validateParams(params as Record<string, string | string[]>, options.validateParams);
          } catch (error) {
            if (error instanceof ValidationError) {
              return ResponseFormatter.validationError(
                'Invalid path parameters',
                error.details,
                requestId
              );
            }
            
            return ResponseFormatter.validationError(
              'Failed to parse path parameters',
              undefined,
              requestId
            );
          }
        }
        
        // Handle request timeout
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          if (options.timeout) {
            timeoutId = setTimeout(() => {
              reject(new Error('Request timeout'));
            }, options.timeout);
          }
        });
        
        try {
          // Execute handler with timeout
          const handlerPromise = handler(request, context);
          const result = await Promise.race([handlerPromise, timeoutPromise]);
          
          const executionTime = performance.now() - startTime;
          
          requestLogger.info('Request processed successfully', {
            executionTimeMs: Math.round(executionTime),
            statusCode: 200
          });
          
          // Format successful response
          return ResponseFormatter.success(result, {
            requestId
          });
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        const executionTime = performance.now() - startTime;
        
        // Log error details
        requestLogger.error('Error processing request', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          executionTimeMs: Math.round(executionTime)
        });
        
        // Handle different error types
        if (error instanceof BaseError) {
          // Handle specific error categories
          switch (error.category) {
            case ErrorCategory.VALIDATION:
              return ResponseFormatter.validationError(
                error.message,
                error.details,
                requestId
              );
              
            case ErrorCategory.AUTH:
              return ResponseFormatter.authError(error.message, requestId);
              
            case ErrorCategory.PERMISSION:
              return ResponseFormatter.forbiddenError(error.message, requestId);
              
            case ErrorCategory.DATABASE:
              return ResponseFormatter.error(error.message, {
                status: error.statusCode || 500,
                code: error.code || 'DATABASE_ERROR',
                requestId,
              });
              
            case ErrorCategory.RATE_LIMIT:
              return ResponseFormatter.rateLimitError(error.message, requestId);
              
            default:
              return ResponseFormatter.error(error.message, {
                status: error.statusCode || 500,
                code: error.code || 'INTERNAL_SERVER_ERROR',
                requestId,
              });
          }
        }
        
        // Handle unknown errors
        return ResponseFormatter.error('An unexpected error occurred', {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          requestId,
        });
      }
    };
  }
  
  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Get client IP address from request
   */
  private getClientIp(request: NextRequest): string {
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
   * Authenticate a request
   * This is a placeholder implementation that should be replaced with actual authentication logic
   */
  private async authenticateRequest(
    request: NextRequest,
    _logger: ReturnType<typeof getLogger>
  ): Promise<{ id: string; email: string; role: string }> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Authentication required', {
        statusCode: 401,
        code: 'MISSING_AUTH_TOKEN',
      });
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      throw new AuthError('Invalid authentication token', {
        statusCode: 401,
        code: 'INVALID_AUTH_TOKEN',
      });
    }
    
    // TODO: Implement actual token validation with Supabase
    // This is a placeholder implementation
    
    // For demonstration purposes only
    if (token === 'invalid') {
      throw new AuthError('Invalid authentication token', {
        statusCode: 401,
        code: 'INVALID_AUTH_TOKEN',
      });
    }
    
    // Return mock user data
    return {
      id: 'user_123',
      email: 'user@example.com',
      role: 'user',
    };
  }
}

/**
 * Create an API handler with the specified options
 */
export function createApiHandler(
  name: string,
  handlers: Partial<Record<HttpMethod, ApiHandlerFunction>>,
  options: ApiHandlerOptions = {}
) {
  const apiHandler = new ApiHandler(name);
  return apiHandler.createHandler(handlers, options);
}