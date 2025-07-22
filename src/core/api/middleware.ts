import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '../../lib/logging';
import { AuthError, RateLimitError } from '../../lib/errors';

export interface MiddlewareContext {
  request: NextRequest;
  requestId: string;
  startTime: number;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  [key: string]: unknown;
}

export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

export class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = [];
  // private logger: Logger;

  constructor() {
    // this.logger = new Logger('MiddlewareChain');
  }

  /**
   * Add middleware to the chain
   */
  use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Execute the middleware chain
   */
  async execute(
    request: NextRequest,
    handler: (context: MiddlewareContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const context: MiddlewareContext = {
      request,
      requestId: this.generateRequestId(),
      startTime: Date.now(),
    };

    let index = 0;

    const next = async (): Promise<NextResponse> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(context, next);
      } else {
        return handler(context);
      }
    };

    return next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Request logging middleware
 */
export const requestLoggingMiddleware: MiddlewareFunction = async (
  context,
  next
) => {
  const logger = getLogger('RequestLogger');
  const { request, requestId, startTime } = context;

  logger.info('Request started', {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      duration,
      status: response.status,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Request failed', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
};

/**
 * CORS middleware
 */
export const corsMiddleware: MiddlewareFunction = async (context, next) => {
  const response = await next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return response;
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (
  requests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): MiddlewareFunction => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return async (context, next) => {
    const ip = context.request.headers.get('x-forwarded-for') || 
               context.request.headers.get('x-real-ip') || 
               'unknown';
    
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requestCounts.entries()) {
      if (value.resetTime < windowStart) {
        requestCounts.delete(key);
      }
    }

    const current = requestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (current.count >= requests && current.resetTime > now) {
      throw new RateLimitError('Rate limit exceeded');
    }

    current.count++;
    requestCounts.set(ip, current);

    return next();
  };
};

/**
 * Authentication middleware
 */
export const authMiddleware: MiddlewareFunction = async (context, next) => {
  const authHeader = context.request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  if (!token) {
    throw new AuthError('Missing authentication token');
  }

  // TODO: Implement actual token validation with Supabase
  // For now, we'll mock a user
  context.user = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'user',
  };

  return next();
};

/**
 * Role-based authorization middleware
 */
export const authorizationMiddleware = (
  allowedRoles: string[]
): MiddlewareFunction => {
  return async (context, next) => {
    if (!context.user) {
      throw new AuthError('Authentication required');
    }

    if (!allowedRoles.includes(context.user.role)) {
      throw new AuthError('Insufficient permissions');
    }

    return next();
  };
};

/**
 * Content type validation middleware
 */
export const contentTypeMiddleware = (
  allowedTypes: string[] = ['application/json']
): MiddlewareFunction => {
  return async (context, next) => {
    const contentType = context.request.headers.get('content-type');

    if (context.request.method !== 'GET' && context.request.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        throw new Error('Invalid content type');
      }
    }

    return next();
  };
};

/**
 * Request size limit middleware
 */
export const requestSizeLimitMiddleware = (
  maxSize: number = 1024 * 1024 // 1MB
): MiddlewareFunction => {
  return async (context, next) => {
    const contentLength = context.request.headers.get('content-length');

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error('Request too large');
    }

    return next();
  };
};