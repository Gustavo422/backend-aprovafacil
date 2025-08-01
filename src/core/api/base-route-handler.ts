import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { BaseApiHandler, ApiHandlerOptions } from './base-api-handler.js';
import { MiddlewareChain, MiddlewareFunction } from './middleware.js';
import { getLogger } from '../../lib/logging/logging-service.js';

/**
 * Base route handler for Express
 * This class provides a foundation for creating API route handlers
 */
export abstract class BaseRouteHandler extends BaseApiHandler {
  protected middlewareChain: MiddlewareChain;
  protected logger: ReturnType<typeof getLogger>;
  protected routeName: string;
  protected router: Router;

  constructor(routeName: string) {
    super();
    this.routeName = routeName;
    this.logger = getLogger(`Route:${routeName}`);
    this.middlewareChain = new MiddlewareChain();
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup Express routes
   */
  protected setupRoutes(): void {
    // GET route
    this.router.get('*', async (req: Request, res: Response) => {
      await this.handleMethod('GET', req, res);
    });

    // POST route
    this.router.post('*', async (req: Request, res: Response) => {
      await this.handleMethod('POST', req, res);
    });

    // PUT route
    this.router.put('*', async (req: Request, res: Response) => {
      await this.handleMethod('PUT', req, res);
    });

    // PATCH route
    this.router.patch('*', async (req: Request, res: Response) => {
      await this.handleMethod('PATCH', req, res);
    });

    // DELETE route
    this.router.delete('*', async (req: Request, res: Response) => {
      await this.handleMethod('DELETE', req, res);
    });

    // OPTIONS route
    this.router.options('*', async (req: Request, res: Response) => {
      await this.handleMethod('OPTIONS', req, res);
    });
  }

  /**
   * Get the Express router
   */
  public getRouter(): Router {
    return this.router;
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
    req: Request,
    res: Response,
    options: ApiHandlerOptions = {},
  ): Promise<void> {
    await this.middlewareChain.execute(req, res, async (context: Record<string, unknown>) => {
      // Add context to the request for use in executeHandler
      (req as Request & { context?: Record<string, unknown> }).context = context;
      await this.handle(req, res, options);
    });
  }

  /**
   * Handle a specific HTTP method
   */
  protected async handleMethod(
    method: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    // Check if method is implemented
    if (!this.isMethodImplemented(method)) {
      res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} not allowed`,
        },
      });
      return;
    }

    // Get validation schemas for this method
    const options = this.getValidationOptions(method);
    
    // Handle the request
    await this.handleRequest(req, res, options);
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
      const authRequiredFn = ((this as unknown) as Record<string, () => boolean>)[authRequiredMethod];
      options.requireAuth = authRequiredFn ? authRequiredFn() : true;
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
    req: Request,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    const method = req.method;
    const methodName = `handle${method}`;
    // Substituir 'any' por 'unknown' e checar se é função
    if (typeof ((this as unknown) as Record<string, unknown>)[methodName] === 'function') {
      return ((this as unknown) as Record<string, (req: Request, ctx: typeof context) => unknown>)[methodName](req, context);
    }
    
    throw new Error(`Method ${method} not implemented`);
  }
}