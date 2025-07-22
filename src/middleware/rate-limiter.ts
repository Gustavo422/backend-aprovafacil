import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedLogger } from '../lib/logging/enhanced-logging-service';

// In-memory store for rate limiting
// In a production environment, this should be replaced with Redis or another distributed cache
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware for Next.js API routes
 * 
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum number of requests allowed in the time window
 * @param keyGenerator - Function to generate a unique key for rate limiting (defaults to IP address)
 * @returns Middleware function
 */
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100, // 100 requests per window
  keyGenerator: (req: NextRequest) => string = (req) => req.headers.get('x-forwarded-for') || 'unknown'
) {
  const logger = getEnhancedLogger('rate-limiter');
  
  return async function rateLimiter(req: NextRequest) {
    const key = keyGenerator(req);
    const now = Date.now();
    const path = req.nextUrl.pathname;
    
    logger.debug('Checking rate limit', { key, path });
    
    // Get current request count for this IP
    const requestData = ipRequestMap.get(key);
    
    // If no previous requests or window expired, create new entry
    if (!requestData || now > requestData.resetTime) {
      ipRequestMap.set(key, { 
        count: 1, 
        resetTime: now + windowMs 
      });
      
      logger.debug('First request in window', { key, path });
      return null; // Allow request to proceed
    }
    
    // If under limit, increment and allow
    if (requestData.count < maxRequests) {
      requestData.count++;
      logger.debug('Request allowed', { key, count: requestData.count, max: maxRequests });
      return null; // Allow request to proceed
    }
    
    // Rate limit exceeded
    logger.warn('Rate limit exceeded', { key, path });
    
    // Calculate remaining time until reset
    const resetInSeconds = Math.ceil((requestData.resetTime - now) / 1000);
    
    // Return rate limit response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas requisições. Tente novamente mais tarde.'
        }
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(resetInSeconds),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(requestData.resetTime / 1000))
        }
      }
    );
  };
}

/**
 * Stricter rate limiting specifically for authentication endpoints
 * 5 attempts per 15 minutes as specified in the requirements
 */
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  (req) => {
    // Use IP address + partial user agent as key to prevent simple IP spoofing
    const userAgent = req.headers.get('user-agent') || '';
    const userAgentKey = userAgent.substring(0, 20); // First 20 chars of user agent
    return `${req.headers.get('x-forwarded-for') || 'unknown'}-${userAgentKey}`;
  }
);

/**
 * Apply rate limiting to a request handler
 * 
 * @param handler - Next.js API route handler
 * @param limiter - Rate limiter function
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  limiter = authRateLimiter
) {
  return async function rateLimit(req: NextRequest) {
    // Apply rate limiter
    const limitResult = await limiter(req);
    
    // If rate limit exceeded, return the error response
    if (limitResult) {
      return limitResult;
    }
    
    // Otherwise, proceed with the original handler
    return handler(req);
  };
}