import { ErrorCategory } from './error-category';
import { BaseError } from './base-error';

/**
 * Error class for network-related errors
 */
export class NetworkError extends BaseError {
  constructor(
    message: string = 'A network error occurred',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.NETWORK,
      retryable: options.retryable !== undefined ? options.retryable : true // Network errors are retryable by default
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error class for authentication-related errors
 */
export class AuthError extends BaseError {
  constructor(
    message: string = 'An authentication error occurred',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.AUTH,
      statusCode: options.statusCode || 401
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Error class for permission-related errors
 */
export class PermissionError extends BaseError {
  constructor(
    message: string = 'Permission denied',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.PERMISSION,
      statusCode: options.statusCode || 403
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Error class for database-related errors
 */
export class DatabaseError extends BaseError {
  constructor(
    message: string = 'A database error occurred',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.DATABASE
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Error class for validation-related errors
 */
export class ValidationError extends BaseError {
  /**
   * Validation errors by field
   */
  public readonly validationErrors: Record<string, string[]>;
  
  constructor(
    message: string = 'Validation failed',
    validationErrors: Record<string, string[]> = {},
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.VALIDATION,
      statusCode: options.statusCode || 422,
      details: {
        ...options.details,
        validationErrors
      }
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
    
    // Set validation errors
    this.validationErrors = validationErrors;
  }
}

/**
 * Error class for not found errors
 */
export class NotFoundError extends BaseError {
  constructor(
    message: string = 'Resource not found',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.UNKNOWN,
      statusCode: options.statusCode || 404
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error class for rate limit errors
 */
export class RateLimitError extends BaseError {
  /**
   * When the rate limit will reset
   */
  public readonly resetAt?: Date;
  
  constructor(
    message: string = 'Rate limit exceeded',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
      resetAt?: Date;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.RATE_LIMIT,
      statusCode: options.statusCode || 429,
      retryable: options.retryable !== undefined ? options.retryable : true // Rate limit errors are retryable by default
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, RateLimitError.prototype);
    
    // Set reset time
    this.resetAt = options.resetAt;
  }
}

/**
 * Error class for timeout errors
 */
export class TimeoutError extends BaseError {
  constructor(
    message: string = 'Operation timed out',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.NETWORK,
      statusCode: options.statusCode || 408,
      retryable: options.retryable !== undefined ? options.retryable : true // Timeout errors are retryable by default
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error class for configuration errors
 */
export class ConfigError extends BaseError {
  constructor(
    message: string = 'Configuration error',
    options: {
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      ...options,
      category: ErrorCategory.CONFIG,
      retryable: false // Configuration errors are not retryable by default
    });
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}
