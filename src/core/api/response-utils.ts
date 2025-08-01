import { Response } from 'express';
import { ApiResponse } from './api-handler.js';

/**
 * Utility class for formatting API responses
 */
export class ResponseUtils {
  /**
   * Format a successful response
   */
  static formatSuccess<T>(
    res: Response,
    data: T,
    options: {
      message?: string;
      requestId: string;
      executionTime?: number;
      status?: number;
    },
  ): void {
    const { message, requestId, executionTime, status = 200 } = options;
    
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...(executionTime !== undefined && { executionTime }),
      },
    };
    
    res.status(status).json(response);
  }
  
  /**
   * Format an error response
   */
  static formatError(
    res: Response,
    message: string,
    options: {
      code: string;
      details?: unknown;
      requestId: string;
      executionTime?: number;
      status?: number;
    },
  ): void {
    const { code, details, requestId, executionTime, status = 500 } = options;
    
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...(executionTime !== undefined && { executionTime }),
      },
    };
    
    res.status(status).json(response);
  }
  
  /**
   * Format a paginated response
   */
  static formatPaginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    options: {
      message?: string;
      requestId: string;
      executionTime?: number;
      status?: number;
    },
  ): void {
    const { message, requestId, executionTime, status = 200 } = options;
    
    const response: ApiResponse<{
      items: T[];
      pagination: typeof pagination;
    }> = {
      success: true,
      data: {
        items: data,
        pagination,
      },
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...(executionTime !== undefined && { executionTime }),
      },
    };
    
    res.status(status).json(response);
  }
  
  /**
   * Format a created response (201 status)
   */
  static formatCreated<T>(
    res: Response,
    data: T,
    options: {
      message?: string;
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatSuccess(res, data, {
      ...options,
      message: options.message || 'Resource created successfully',
      status: 201,
    });
  }
  
  /**
   * Format a no content response (204 status)
   */
  static formatNoContent(
    res: Response,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    const { requestId, executionTime } = options;
    
    const response: ApiResponse = {
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
        ...(executionTime !== undefined && { executionTime }),
      },
    };
    
    res.status(204).json(response);
  }
  
  /**
   * Format a validation error response (400 status)
   */
  static formatValidationError(
    res: Response,
    message: string,
    details: unknown,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'VALIDATION_ERROR',
      details,
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 400,
    });
  }
  
  /**
   * Format an authentication error response (401 status)
   */
  static formatAuthError(
    res: Response,
    message: string,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'AUTHENTICATION_ERROR',
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 401,
    });
  }
  
  /**
   * Format a forbidden error response (403 status)
   */
  static formatForbiddenError(
    res: Response,
    message: string,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'FORBIDDEN',
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 403,
    });
  }
  
  /**
   * Format a not found error response (404 status)
   */
  static formatNotFoundError(
    res: Response,
    message: string,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'NOT_FOUND',
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 404,
    });
  }
  
  /**
   * Format a conflict error response (409 status)
   */
  static formatConflictError(
    res: Response,
    message: string,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'CONFLICT',
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 409,
    });
  }
  
  /**
   * Format a rate limit error response (429 status)
   */
  static formatRateLimitError(
    res: Response,
    message: string,
    options: {
      requestId: string;
      executionTime?: number;
    },
  ): void {
    this.formatError(res, message, {
      code: 'RATE_LIMIT_EXCEEDED',
      requestId: options.requestId,
      executionTime: options.executionTime,
      status: 429,
    });
  }
}