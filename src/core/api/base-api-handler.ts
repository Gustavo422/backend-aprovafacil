import { Request, Response } from 'express';
import { z } from 'zod';
import { getLogger } from '../../lib/logging';
import { BaseError } from '../../lib/errors/base-error';
import { ValidationError, AuthError } from '../../lib/errors';
// import { URL } from 'url';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export abstract class BaseApiHandler {
  protected logger: ReturnType<typeof getLogger>;

  constructor() {
    this.logger = getLogger('ApiHandler');
  }

  /**
   * Main handler method that wraps the actual handler with error handling
   */
  public async handle(
    req: Request,
    res: Response,
    options: ApiHandlerOptions = {},
  ): Promise<void> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Log incoming request
      this.logger.info('API request received', {
        method: req.method,
        url: req.url,
        requestId,
        userAgent: req.headers['user-agent'],
      });

      // Validate authentication if required
      if (options.requireAuth) {
        await this.validateAuthentication(req);
      }

      // Validate request body if schema provided
      let validatedBody;
      if (options.validateBody && req.method !== 'GET') {
        validatedBody = this.validateRequestBody(req, options.validateBody);
      }

      // Validate query parameters if schema provided
      let validatedQuery;
      if (options.validateQuery) {
        validatedQuery = this.validateQueryParams(req, options.validateQuery);
      }

      // Execute the actual handler
      const result = await this.executeHandler(req, {
        body: validatedBody,
        query: validatedQuery,
        requestId,
      });

      // Format successful response
      const response = this.formatSuccessResponse(result, requestId);
      
      // Log successful response
      const duration = Date.now() - startTime;
      this.logger.info('API request completed', {
        requestId,
        duration,
        status: 200,
      });

      res.status(200).json(response);

    } catch (error) {
      // Handle and format error response
      const duration = Date.now() - startTime;
      this.handleError(error, req, res, requestId, duration);
    }
  }

  /**
   * Abstract method to be implemented by concrete handlers
   */
  protected abstract executeHandler(
    req: Request,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ): Promise<unknown>;

  /**
   * Validate authentication token
   */
  protected async validateAuthentication(req: Request): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      throw new AuthError('Missing authentication token');
    }

    // TODO: Implement actual token validation with Supabase
    // This would typically involve verifying the JWT token
    // For now, we'll just check if token exists
  }

  /**
   * Validate request body against schema
   */
  protected validateRequestBody(
    req: Request,
    schema: z.ZodSchema,
  ): unknown {
    try {
      return schema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request body');
      }
      throw new ValidationError('Failed to parse request body');
    }
  }

  /**
   * Validate query parameters against schema
   */
  protected validateQueryParams(
    req: Request,
    schema: z.ZodSchema,
  ): unknown {
    try {
      return schema.parse(req.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid query parameters');
      }
      throw new ValidationError('Failed to parse query parameters');
    }
  }

  /**
   * Format successful response
   */
  protected formatSuccessResponse<T>(data: T, requestId: string): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };
  }

  /**
   * Handle and format error response
   */
  protected handleError(
    error: unknown,
    req: Request,
    res: Response,
    requestId: string,
    duration: number,
  ): void {
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (error instanceof BaseError) {
      if (error instanceof ValidationError) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      } else if (error instanceof AuthError) {
        statusCode = 401;
        errorCode = 'AUTHENTICATION_ERROR';
      }
      
      message = error.message;
      details = error.details;
    }

    // Log error
    this.logger.error('API request failed', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      statusCode,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    res.status(statusCode).json(response);
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}