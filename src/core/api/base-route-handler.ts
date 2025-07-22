import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseApiHandler, ApiHandlerOptions } from './base-api-handler';
import { MiddlewareChain, MiddlewareFunction } from './middleware';
import { getLogger } from '../../lib/logging';

/**
 * Base route handler for Next.js App Router
 * This class provides a foundation for creating API route handlers
 */
export abstract class BaseRouteHandler extends BaseApiHandler {
  protected middlewareChain: MiddlewareChain;
  protected logger: ReturnType<typeof getLogger>;
  protected routeName: string;

  constructor(routeName: string) {
    super();
    this.routeName = routeName;
    this.logger = getLogger(`Route:${routeName}`);
    this.middlewareChain = new MiddlewareChain();
  }

  /**
   * Add middleware to the chain
   */
  public use(middleware: MiddlewareFunction): this {
    this.middlewareChain.use(middleware);
    return this;
  }

  /**
   * Handle the request with middleware chain
   */
  public async handleRequest(
    request: NextRequest,
    options: ApiHandlerOptions = {}
  ): Promise<NextResponse> {
    return this.middlewareChain.execute(request, async (context: Record<string, unknown>) => {
      // Add context to the request for use in executeHandler
      const requestWithContext = request as NextRequest & { context?: Record<string, unknown> };
      requestWithContext.context = context;
      return this.handle(request, options);
    });
  }

  /**
   * Create route handlers for Next.js App Router
   */
  public createRouteHandlers() {
    // Removido o aliasing de 'this' para 'self'
    return {
      GET: async (request: NextRequest) => {
        return this.handleMethod('GET', request);
      },
      POST: async (request: NextRequest) => {
        return this.handleMethod('POST', request);
      },
      PUT: async (request: NextRequest) => {
        return this.handleMethod('PUT', request);
      },
      PATCH: async (request: NextRequest) => {
        return this.handleMethod('PATCH', request);
      },
      DELETE: async (request: NextRequest) => {
        return this.handleMethod('DELETE', request);
      },
      OPTIONS: async (request: NextRequest) => {
        return this.handleMethod('OPTIONS', request);
      },
    };
  }

  /**
   * Handle a specific HTTP method
   */
  protected async handleMethod(
    method: string,
    request: NextRequest
  ): Promise<NextResponse> {
    // Check if method is implemented
    if (!this.isMethodImplemented(method)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed`,
          },
        },
        { status: 405 }
      );
    }

    // Get validation schemas for this method
    const options = this.getValidationOptions(method);
    
    // Handle the request
    return this.handleRequest(request, options);
  }

  /**
   * Check if a method is implemented
   */
  protected isMethodImplemented(method: string): boolean {
    const methodName = `handle${method}`;
    // Substituir 'any' por 'unknown' e checar se é função
    return typeof (this as Record<string, unknown>)[methodName] === 'function';
  }

  /**
   * Get validation options for a specific method
   */
  protected getValidationOptions(method: string): ApiHandlerOptions {
    // Default options
    const options: ApiHandlerOptions = {};
    
    // Add method-specific validation schemas
    const bodySchemaMethod = `get${method}BodySchema`;
    const bodySchemaFn = ((this as unknown) as Record<string, unknown>)[bodySchemaMethod];
    if (typeof bodySchemaFn === 'function') {
      const result = (bodySchemaFn as () => unknown)();
      if (result instanceof z.ZodType) {
        options.validateBody = result;
      }
    }
    
    const querySchemaMethod = `get${method}QuerySchema`;
    const querySchemaFn = ((this as unknown) as Record<string, unknown>)[querySchemaMethod];
    if (typeof querySchemaFn === 'function') {
      const result = (querySchemaFn as () => unknown)();
      if (result instanceof z.ZodType) {
        options.validateQuery = result;
      }
    }
    
    // Add authentication requirement
    const authRequiredMethod = `is${method}AuthRequired`;
    if (typeof ((this as unknown) as Record<string, unknown>)[authRequiredMethod] === 'function') {
      options.requireAuth = ((this as unknown) as Record<string, () => boolean>)[authRequiredMethod]!();
    } else {
      // Default to requiring authentication
      options.requireAuth = true;
    }
    
    return options;
  }

  /**
   * Implementation of the abstract executeHandler method
   */
  protected async executeHandler(
    request: NextRequest,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    const method = request.method;
    const methodName = `handle${method}`;
    // Substituir 'any' por 'unknown' e checar se é função
    if (typeof ((this as unknown) as Record<string, unknown>)[methodName] === 'function') {
      return ((this as unknown) as Record<string, (req: NextRequest, ctx: typeof context) => unknown>)[methodName](request, context);
    }
    
    throw new Error(`Method ${method} not implemented`);
  }
}