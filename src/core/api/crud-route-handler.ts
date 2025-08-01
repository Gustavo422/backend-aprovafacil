import { Request } from 'express';
import { z } from 'zod';
import { BaseRouteHandler } from './base-route-handler.js';
import { ResponseFormatter } from './response-formatter.js';

/**
 * Base CRUD route handler for resource-based API routes
 * This class provides a foundation for creating CRUD API endpoints
 */
export abstract class CrudRouteHandler<
  T extends Record<string, unknown>
> extends BaseRouteHandler {
  /**
   * Get validation schema for resource creation
   */
  protected abstract getCreateSchema(): z.ZodSchema;

  /**
   * Get validation schema for resource update
   */
  protected abstract getUpdateSchema(): z.ZodSchema;

  /**
   * Get validation schema for resource ID
   */
  protected getIdSchema(): z.ZodSchema {
    return z.object({
      id: z.string(),
    });
  }

  /**
   * Get validation schema for query parameters
   */
  protected getQuerySchema(): z.ZodSchema {
    return z.object({
      page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
    });
  }

  /**
   * Get validation schema for POST requests
   */
  protected getPOSTBodySchema(): z.ZodSchema {
    return this.getCreateSchema();
  }

  /**
   * Get validation schema for PUT requests
   */
  protected getPUTBodySchema(): z.ZodSchema {
    return this.getUpdateSchema();
  }

  /**
   * Get validation schema for PATCH requests
   */
  protected getPATCHBodySchema(): z.ZodSchema {
    return this.getUpdateSchema();
  }

  /**
   * Get validation schema for GET query parameters
   */
  protected getGETQuerySchema(): z.ZodSchema {
    return this.getQuerySchema();
  }

  /**
   * Handle GET requests
   */
  protected async handleGET(
    req: Request,
    context: {
      query?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    try {
      // Check if this is a single resource request
      const pathParts = req.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      // If the last part is not the resource name, it's likely an ID
      if (lastPart !== this.routeName.toLowerCase() && lastPart !== '') {
        return this.handleGetOne(lastPart, context);
      }
      
      // Otherwise, it's a list request
      return this.handleGetList(context.query as Record<string, unknown>, context);
    } catch (error) {
      this.logger.error('Error handling GET request', { 
        requestId: context.requestId, 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      return ResponseFormatter.error('Error processing request', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle POST requests
   */
  protected async handlePOST(
    req: Request,
    context: {
      body?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    try {
      return this.handleCreate(context.body as T, context);
    } catch (error) {
      this.logger.error('Error handling POST request', { 
        requestId: context.requestId, 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      return ResponseFormatter.error('Error processing request', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PUT requests
   */
  protected async handlePUT(
    req: Request,
    context: {
      body?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    try {
      // Get ID from URL
      const pathParts = req.path.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || id === this.routeName.toLowerCase()) {
        return ResponseFormatter.error('Resource ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }
      
      return this.handleUpdate(id, context.body as T, context);
    } catch (error) {
      this.logger.error('Error handling PUT request', { 
        requestId: context.requestId, 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      return ResponseFormatter.error('Error processing request', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PATCH requests
   */
  protected async handlePATCH(
    req: Request,
    context: {
      body?: unknown;
      requestId: string;
    },
  ): Promise<unknown> {
    try {
      // Get ID from URL
      const pathParts = req.path.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || id === this.routeName.toLowerCase()) {
        return ResponseFormatter.error('Resource ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }
      
      return this.handlePartialUpdate(id, context.body as Partial<T>, context);
    } catch (error) {
      this.logger.error('Error handling PATCH request', { 
        requestId: context.requestId, 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      return ResponseFormatter.error('Error processing request', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle DELETE requests
   */
  protected async handleDELETE(
    req: Request,
    context: {
      requestId: string;
    },
  ): Promise<unknown> {
    try {
      // Get ID from URL
      const pathParts = req.path.split('/');
      const id = pathParts[pathParts.length - 1];
      
      if (!id || id === this.routeName.toLowerCase()) {
        return ResponseFormatter.error('Resource ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }
      
      return this.handleRemove(id, context);
    } catch (error) {
      this.logger.error('Error handling DELETE request', { 
        requestId: context.requestId, 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      return ResponseFormatter.error('Error processing request', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle getting a list of resources
   */
  protected abstract handleGetList(
    query: Record<string, unknown>,
    context: { requestId: string }
  ): Promise<unknown>;

  /**
   * Handle getting a single resource
   */
  protected abstract handleGetOne(
    id: string,
    context: { requestId: string }
  ): Promise<unknown>;

  /**
   * Handle creating a resource
   */
  protected abstract handleCreate(
    data: T,
    context: { requestId: string }
  ): Promise<unknown>;

  /**
   * Handle updating a resource
   */
  protected abstract handleUpdate(
    id: string,
    data: T,
    context: { requestId: string }
  ): Promise<unknown>;

  /**
   * Handle partial update of a resource
   */
  protected abstract handlePartialUpdate(
    id: string,
    data: Partial<T>,
    context: { requestId: string }
  ): Promise<unknown>;

  /**
   * Handle removing a resource
   */
  protected abstract handleRemove(
    id: string,
    context: { requestId: string }
  ): Promise<unknown>;
}