import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors';

export interface ValidationResult<T> {
  data: T;
  errors?: z.ZodError;
}

export class RequestValidator {
  /**
   * Validate request body against schema
   */
  static async validateBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        throw new ValidationError('Invalid request body', {
          details: result.error.errors.map(e => e.message),
        });
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to parse request body');
    }
  }

  /**
   * Validate query parameters against schema
   */
  static validateQuery<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): T {
    try {
      const url = new globalThis.URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      const result = schema.safeParse(queryParams);
      
      if (!result.success) {
        throw new ValidationError('Invalid query parameters', {
          details: result.error.errors.map(e => e.message),
        });
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to parse query parameters');
    }
  }

  /**
   * Validate path parameters against schema
   */
  static validateParams<T>(
    params: Record<string, string | string[]>,
    schema: z.ZodSchema<T>
  ): T {
    try {
      const result = schema.safeParse(params);
      
      if (!result.success) {
        throw new ValidationError('Invalid path parameters', {
          details: result.error.errors.map(e => e.message),
        });
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to parse path parameters');
    }
  }

  /**
   * Validate headers against schema
   */
  static validateHeaders<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>
  ): T {
    try {
      const headers = Object.fromEntries(request.headers.entries());
      const result = schema.safeParse(headers);
      
      if (!result.success) {
        throw new ValidationError('Invalid headers', {
          details: result.error.errors.map(e => e.message),
        });
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to parse headers');
    }
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    // Pagination schema
    pagination: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
    }),

    // ID parameter schema
    id: z.object({
      id: z.string().uuid('Invalid ID format'),
    }),

    // Search schema
    search: z.object({
      q: z.string().optional(),
      filter: z.string().optional(),
    }),

    // Date range schema
    dateRange: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }),

    // Common headers schema
    authHeaders: z.object({
      authorization: z.string().startsWith('Bearer '),
    }),
  };

  /**
   * Validate pagination parameters
   */
  static validatePagination(request: NextRequest) {
    return this.validateQuery(request, this.schemas.pagination);
  }

  /**
   * Validate ID parameter
   */
  static validateId(params: Record<string, string | string[]>) {
    return this.validateParams(params, this.schemas.id);
  }

  /**
   * Validate search parameters
   */
  static validateSearch(request: NextRequest) {
    return this.validateQuery(request, this.schemas.search);
  }

  /**
   * Validate date range parameters
   */
  static validateDateRange(request: NextRequest) {
    return this.validateQuery(request, this.schemas.dateRange);
  }

  /**
   * Validate authorization header
   */
  static validateAuthHeaders(request: NextRequest) {
    return this.validateHeaders(request, this.schemas.authHeaders);
  }

  /**
   * Combine multiple validation results
   */
  static combine<T extends Record<string, unknown>>(
    ...validations: Array<() => Partial<T>>
  ): T {
    return validations.reduce((acc, validation) => {
      return { ...acc, ...validation() };
    }, {} as T);
  }
}