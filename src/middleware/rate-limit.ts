import { NextRequest, NextResponse } from 'next/server';
import { RateLimitError } from '@/lib/errors';
import { getLogger } from '@/lib/logging';

const logger = getLogger('rate-limit-middleware');

// In-memory store for rate limiting
// In production, use Redis or another distributed store
const rateLimitStore = new Map<string, { count: number; resetAt: Date }>();

/**
 * Middleware for rate limiting requests
 * @param limit Maximum number of requests
 * @param windowMs Time window in milliseconds
 * @param keyGenerator Function to generate a key for rate limiting
 * @returns Middleware function
 */
export function rateLimit(
  limit: number,
  windowMs: number = 60000,
  keyGenerator: (req: NextRequest) => string = defaultKeyGenerator
): (request: NextRequest, handler: () => Promise<NextResponse>) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    // Generate key
    const key = keyGenerator(request);
    
    // Get current time
    const now = new Date();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetAt < now) {
      // Create new entry
      entry = {
        count: 0,
        resetAt: new Date(now.getTime() + windowMs)
      };
      
      rateLimitStore.set(key, entry);
    }
    
    // Increment count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > limit) {
      // Calculate remaining time
      const remainingMs = entry.resetAt.getTime() - now.getTime();
      const remainingSecs = Math.ceil(remainingMs / 1000);
      
      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', { key, limit, remainingSecs });
      
      // Throw rate limit error
      throw new RateLimitError('Rate limit exceeded', {
        statusCode: 429,
        code: 'rate_limit_exceeded',
        details: {
          limit,
          remaining: 0,
          reset: entry.resetAt.toISOString(),
          resetSeconds: remainingSecs
        },
        resetAt: entry.resetAt
      });
    }
    
    // Calculate remaining requests
    const remaining = limit - entry.count;
    
    // Call handler
    const response = await handler();
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetAt.getTime() / 1000).toString());
    
    return response;
  };
}

/**
 * Default key generator function
 * @param req Request object
 * @returns Rate limit key
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Use IP address as key
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return `rate-limit:${ip}`;
}

/**
 * Rate limit by user ID
 * @param limit Maximum number of requests
 * @param windowMs Time window in milliseconds
 * @returns Middleware function
 */
export function rateLimitByUser(limit: number, windowMs: number = 60000) {
  return rateLimit(limit, windowMs, (req: NextRequest) => {
    // Try to get user ID from session
    const userId = req.headers.get('x-user-id') || 'anonymous';
    return `rate-limit:user:${userId}`;
  });
}

/**
 * Rate limit by IP address
 * @param limit Maximum number of requests
 * @param windowMs Time window in milliseconds
 * @returns Middleware function
 */
export function rateLimitByIp(limit: number, windowMs: number = 60000) {
  return rateLimit(limit, windowMs);
}
