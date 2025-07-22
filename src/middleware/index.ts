import { NextRequest } from 'next/server';

// Error handling middleware
export { errorHandlerMiddleware } from './error-handler';

// Authentication middleware
export { requireAuth, requireAdmin } from './auth';
export { createAdminAuthMiddleware, createFastAdminCheckMiddleware } from './admin-auth';

// Validation middleware
export { validateRequest } from './validation';

// Rate limiting middleware
export { rateLimit, rateLimitByUser, rateLimitByIp } from './rate-limit';

/**
 * Compose multiple middleware functions
 * @param middlewares Middleware functions to compose
 * @returns Composed middleware function
 */
export function composeMiddleware<TReq = NextRequest, TResult = unknown>(
  ...middlewares: Array<(req: TReq, handler: (req: TReq) => Promise<TResult>) => Promise<TResult>>
) {
  return async (req: TReq, handler: (req: TReq) => Promise<TResult>): Promise<TResult> => {
    // Create a function that executes each middleware in sequence
    const executeMiddleware = async (index: number): Promise<TResult> => {
      // If we've run all middleware, execute the handler
      if (index === middlewares.length) {
        return await handler(req);
      }
      // Execute the current middleware, passing the next middleware as the handler
      return await middlewares[index](req, () => executeMiddleware(index + 1));
    };
    // Start executing middleware
    return await executeMiddleware(0);
  };
}
