import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseApiHandler } from './base-api-handler';
import { MiddlewareChain, requestLoggingMiddleware, corsMiddleware } from './middleware';

/**
 * Example concrete API handler that extends BaseApiHandler
 */
export class ConcreteApiHandler extends BaseApiHandler {
  private middlewareChain: MiddlewareChain;

  constructor() {
    super();
    this.middlewareChain = new MiddlewareChain()
      .use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Handle the request with middleware chain
   */
  public async handleWithMiddleware(
    request: NextRequest,
    options: {
      requireAuth?: boolean;
      validateBody?: z.ZodSchema;
      validateQuery?: z.ZodSchema;
    } = {}
  ) {
    return this.middlewareChain.execute(request, async (context: Record<string, unknown>) => {
      // Add context to the request for use in executeHandler
      (request as NextRequest & { context?: Record<string, unknown> }).context = context;
      return this.handle(request, options);
    });
  }

  /**
   * Implementation of the abstract executeHandler method
   * This should be overridden by specific handlers
   */
  protected async executeHandler(
    request: NextRequest,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    // This is a base implementation that should be overridden
    // by specific handlers for different endpoints
    
    switch (request.method) {
      case 'GET':
        return this.handleGet(request, context);
      case 'POST':
        return this.handlePost(request, context);
      case 'PUT':
        return this.handlePut(request, context);
      case 'DELETE':
        return this.handleDelete(request, context);
      default:
        throw new Error(`Method ${request.method} not allowed`);
    }
  }

  /**
   * Handle GET requests
   */
  protected async handleGet(
    _request: NextRequest,
    _context: { query?: unknown; requestId: string }
  ): Promise<unknown> {
    throw new Error('GET method not implemented');
  }

  /**
   * Handle POST requests
   */
  protected async handlePost(
    _request: NextRequest,
    _context: { body?: unknown; requestId: string }
  ): Promise<unknown> {
    throw new Error('POST method not implemented');
  }

  /**
   * Handle PUT requests
   */
  protected async handlePut(
    _request: NextRequest,
    _context: { body?: unknown; requestId: string }
  ): Promise<unknown> {
    throw new Error('PUT method not implemented');
  }

  /**
   * Handle DELETE requests
   */
  protected async handleDelete(
    _request: NextRequest,
    _context: { requestId: string }
  ): Promise<unknown> {
    throw new Error('DELETE method not implemented');
  }
}

/**
 * Factory function to create API handlers with common middleware
 */
export function createApiHandler(
  handler: (
    request: NextRequest,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ) => Promise<unknown>
) {
  class CustomApiHandler extends BaseApiHandler {
    protected async executeHandler(
      request: NextRequest,
      context: {
        body?: unknown;
        query?: unknown;
        requestId: string;
      }
    ): Promise<unknown> {
      return handler(request, context);
    }
  }

  const apiHandler = new CustomApiHandler();
  const middlewareChain = new MiddlewareChain()
    .use(requestLoggingMiddleware)
    .use(corsMiddleware);

  return {
    handler: apiHandler,
    handle: (request: NextRequest, options: {
      requireAuth?: boolean;
      validateBody?: z.ZodSchema;
      validateQuery?: z.ZodSchema;
    } = {}) =>
      middlewareChain.execute(request, async (context: Record<string, unknown>) => {
        (request as NextRequest & { context?: Record<string, unknown> }).context = context;
        return apiHandler.handle(request, options);
      }),
  };
}