import { Request, Response } from 'express';
import { getLogger } from '../../lib/logging';
import { AuthError, RateLimitError } from '../../lib/errors';

export interface MiddlewareContext {
  req: Request;
  res: Response;
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
  next: () => Promise<void>
) => Promise<void>;

export class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = [];

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
    req: Request,
    res: Response,
    handler: (context: MiddlewareContext) => Promise<void>,
  ): Promise<void> {
    const context: MiddlewareContext = {
      req,
      res,
      requestId: this.generateRequestId(),
      startTime: Date.now(),
    };

    let index = 0;

    const next = async (): Promise<void> => {
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
  next,
) => {
  const logger = getLogger('RequestLogger');
  const { req, requestId, startTime } = context;

  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
  });

  try {
    await next();
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      duration,
      status: context.res.statusCode,
    });
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
  const { res } = context;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );

  await next();
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (
  requests: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
): MiddlewareFunction => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return async (context, next) => {
    const ip = Array.isArray(context.req.ip) ? context.req.ip[0] : context.req.ip || 'unknown';
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

    await next();
  };
};

/**
 * Authentication middleware
 */
export const authMiddleware: MiddlewareFunction = async (context, next) => {
  const authHeader = context.req.headers.authorization;

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

  await next();
};

/**
 * Role-based authorization middleware
 */
export const authorizationMiddleware = (
  allowedRoles: string[],
): MiddlewareFunction => {
  return async (context, next) => {
    if (!context.user) {
      throw new AuthError('Authentication required');
    }

    if (!allowedRoles.includes(context.user.role)) {
      throw new AuthError('Insufficient permissions');
    }

    await next();
  };
};

/**
 * Content type validation middleware
 */
export const contentTypeMiddleware = (
  allowedTypes: string[] = ['application/json'],
): MiddlewareFunction => {
  return async (context, next) => {
    const contentType = context.req.headers['content-type'];

    if (context.req.method !== 'GET' && context.req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        throw new Error('Invalid content type');
      }
    }

    await next();
  };
};

/**
 * Request size limit middleware
 */
export const requestSizeLimitMiddleware = (
  maxSize: number = 1024 * 1024, // 1MB
): MiddlewareFunction => {
  return async (context, next) => {
    const contentLength = context.req.headers['content-length'];

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error('Request too large');
    }

    await next();
  };
};