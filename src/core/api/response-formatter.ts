export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

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
    } = {},
  ): ApiResponse<T> {
    const { requestId = '', message } = options;

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

    return response;
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
    } = {},
  ): ApiResponse {
    const { 
      code = 'INTERNAL_SERVER_ERROR', 
      details,
      requestId = '', 
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

    return response;
  }

  /**
   * Create a validation error response
   */
  static validationError(
    message: string,
    details: unknown,
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
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
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
      code: 'AUTHENTICATION_ERROR',
      requestId,
    });
  }

  /**
   * Create an authorization error response
   */
  static forbiddenError(
    message: string = 'Access forbidden',
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
      code: 'AUTHORIZATION_ERROR',
      requestId,
    });
  }

  /**
   * Create a not found error response
   */
  static notFoundError(
    message: string = 'Resource not found',
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
      code: 'NOT_FOUND',
      requestId,
    });
  }

  /**
   * Create a conflict error response
   */
  static conflictError(
    message: string = 'Resource conflict',
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
      code: 'CONFLICT',
      requestId,
    });
  }

  /**
   * Create a rate limit error response
   */
  static rateLimitError(
    message: string = 'Rate limit exceeded',
    requestId?: string,
  ): ApiResponse {
    return this.error(message, {
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
    requestId?: string,
  ): ApiResponse<{
    items: T[];
    pagination: typeof pagination;
  }> {
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

    return response;
  }

  /**
   * Create a no content response
   */
  static noContent(requestId?: string): ApiResponse {
    const response: ApiResponse = {
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || '',
        version: '1.0.0',
      },
    };

    return response;
  }
} 