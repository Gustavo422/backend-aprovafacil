import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseApiHandler } from './base-api-handler.js';
import { MiddlewareChain, requestLoggingMiddleware, corsMiddleware } from './middleware.js';

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
    req: Request,
    res: Response,
    options: {
      requireAuth?: boolean;
      validateBody?: z.ZodSchema;
      validateQuery?: z.ZodSchema;
    } = {},
  ) {
    await this.middlewareChain.execute(req, res, async (context: Record<string, unknown>) => {
      // Add context to the request for use in executeHandler
      (req as Request & { context?: Record<string, unknown> }).context = context;
      await this.handle(req, res, options);
    });
  }

  /**
   * Implementation of the abstract executeHandler method
   * This should be overridden by specific handlers
   */
  protected async executeHandler(
    req: Request,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    // This is a base implementation that should be overridden
    // by specific handlers for different endpoints
    
    switch (req.method) {
    case 'GET':
      return this.handleGet(req, context);
    case 'POST':
      return this.handlePost(req, context);
    case 'PUT':
      return this.handlePut(req, context);
    case 'DELETE':
      return this.handleDelete(req, context);
    default:
      throw new Error(`Method ${req.method} not allowed`);
    }
  }

  /**
   * Handle GET requests
   */
  protected async handleGet(
    _req: Request,
    _context: { query?: unknown; requestId: string },
  ): Promise<unknown> {
    throw new Error('GET method not implemented');
  }

  /**
   * Handle POST requests
   */
  protected async handlePost(
    _req: Request,
    _context: { body?: unknown; requestId: string },
  ): Promise<unknown> {
    throw new Error('POST method not implemented');
  }

  /**
   * Handle PUT requests
   */
  protected async handlePut(
    _req: Request,
    _context: { body?: unknown; requestId: string },
  ): Promise<unknown> {
    throw new Error('PUT method not implemented');
  }

  /**
   * Handle DELETE requests
   */
  protected async handleDelete(
    _req: Request,
    _context: { requestId: string },
  ): Promise<unknown> {
    throw new Error('DELETE method not implemented');
  }
}

/**
 * Factory function to create API handlers with common middleware
 */
export function createApiHandler(
  handler: (
    req: Request,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ) => Promise<unknown>,
) {
  class CustomApiHandler extends BaseApiHandler {
    protected async executeHandler(
      req: Request,
      context: {
        body?: unknown;
        query?: unknown;
        requestId: string;
      },
    ): Promise<unknown> {
      return handler(req, context);
    }
  }

  const apiHandler = new CustomApiHandler();
  const middlewareChain = new MiddlewareChain()
    .use(requestLoggingMiddleware)
    .use(corsMiddleware);

  return {
    handler: apiHandler,
    handle: async (req: Request, res: Response, options: {
      requireAuth?: boolean;
      validateBody?: z.ZodSchema;
      validateQuery?: z.ZodSchema;
    } = {}) => {
      await middlewareChain.execute(req, res, async (context: Record<string, unknown>) => {
        (req as Request & { context?: Record<string, unknown> }).context = context;
        await apiHandler.handle(req, res, options);
      });
    },
  };
}