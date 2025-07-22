import { NextResponse } from 'next/server';
import { ApiResponse } from './base-api-handler';

export class ResponseFormatter {
  /**
   * Create a successful response
   */
  static success<T>(
    data: T,
    options: {
      status?: number;
      requestId?: string;
      message?: string;
    } = {}
  ): NextResponse {
    const { status = 200, requestId = '', message } = options;

    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { status });
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: unknown;
      requestId?: string;
    } = {}
  ): NextResponse {
    const { 
      status = 500, 
      code = 'INTERNAL_SERVER_ERROR', 
      details,
      requestId = '' 
    } = options;

    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { status });
  }

  /**
   * Create a validation error response
   */
  static validationError(
    message: string,
    details: unknown,
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 400,
      code: 'VALIDATION_ERROR',
      details,
      requestId,
    });
  }

  /**
   * Create an authentication error response
   */
  static authError(
    message: string = 'Authentication required',
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 401,
      code: 'AUTHENTICATION_ERROR',
      requestId,
    });
  }

  /**
   * Create an authorization error response
   */
  static forbiddenError(
    message: string = 'Access forbidden',
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 403,
      code: 'AUTHORIZATION_ERROR',
      requestId,
    });
  }

  /**
   * Create a not found error response
   */
  static notFoundError(
    message: string = 'Resource not found',
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 404,
      code: 'NOT_FOUND',
      requestId,
    });
  }

  /**
   * Create a conflict error response
   */
  static conflictError(
    message: string = 'Resource conflict',
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 409,
      code: 'CONFLICT',
      requestId,
    });
  }

  /**
   * Create a rate limit error response
   */
  static rateLimitError(
    message: string = 'Rate limit exceeded',
    requestId?: string
  ): NextResponse {
    return this.error(message, {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      requestId,
    });
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    requestId?: string
  ): NextResponse {
    const response: ApiResponse<{
      items: T[];
      pagination: typeof pagination;
    }> = {
      success: true,
      data: {
        items: data,
        pagination,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || '',
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { status: 200 });
  }

  /**
   * Create a no content response
   */
  static noContent(requestId?: string): NextResponse {
    const response: ApiResponse = {
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || '',
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, { status: 204 });
  }
}