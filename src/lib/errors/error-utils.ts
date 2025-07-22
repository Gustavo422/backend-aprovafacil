import { ErrorCategory } from './error-category';
import { BaseError } from './base-error';
import {
  AuthError,
  ConfigError,
  DatabaseError,
  NetworkError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  TimeoutError,
  ValidationError
} from './error-types';

/**
 * Convert an unknown error to a BaseError
 * @param error Unknown error
 * @returns BaseError instance
 */
export function toBaseError(error: unknown): BaseError {
  // If already a BaseError, return as is
  if (error instanceof BaseError) {
    return error;
  }
  
  // If a standard Error, convert to BaseError
  if (error instanceof Error) {
    return new BaseError(error.message, { cause: error });
  }
  
  // If a string, create a BaseError with the string as message
  if (typeof error === 'string') {
    return new BaseError(error);
  }
  
  // If an object, try to extract information
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const message = typeof errorObj.message === 'string' ? errorObj.message : 'Unknown error';
    const statusCode = typeof errorObj.statusCode === 'number' ? errorObj.statusCode :
                      typeof errorObj.status === 'number' ? errorObj.status : undefined;
    const code = typeof errorObj.code === 'string' ? errorObj.code : undefined;
    
    return new BaseError(message, {
      statusCode,
      code,
      details: errorObj
    });
  }
  
  // Default case
  return new BaseError('Unknown error occurred');
}

/**
 * Create a specific error based on the error category
 * @param error Unknown error
 * @returns Specific error instance
 */
export function createSpecificError(error: unknown): BaseError {
  // Convert to BaseError first
  const baseError = toBaseError(error);
  
  // Create specific error based on category
  switch (baseError.category) {
    case ErrorCategory.AUTH:
      return new AuthError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause
      });
      
    case ErrorCategory.NETWORK:
      return new NetworkError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause
      });
      
    case ErrorCategory.DATABASE:
      return new DatabaseError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause
      });
      
    case ErrorCategory.VALIDATION:
      return new ValidationError(
        baseError.message,
        baseError.details?.validationErrors as Record<string, string[]> || {},
        {
          statusCode: baseError.statusCode,
          code: baseError.code,
          retryable: baseError.retryable,
          details: baseError.details,
          cause: baseError.cause
        }
      );
      
    case ErrorCategory.PERMISSION:
      return new PermissionError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause
      });
      
    case ErrorCategory.RATE_LIMIT:
      return new RateLimitError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause,
        resetAt: baseError.details?.resetAt as Date
      });
      
    case ErrorCategory.CONFIG:
      return new ConfigError(baseError.message, {
        statusCode: baseError.statusCode,
        code: baseError.code,
        retryable: baseError.retryable,
        details: baseError.details,
        cause: baseError.cause
      });
      
    default:
      return baseError;
  }
}

/**
 * Create a specific error based on HTTP status code
 * @param statusCode HTTP status code
 * @param message Error message
 * @param options Additional options
 * @returns Specific error instance
 */
export function createErrorFromStatusCode(
  statusCode: number,
  message?: string,
  options: {
    code?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
    cause?: Error;
  } = {}
): BaseError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message || 'Bad request', {}, {
        ...options,
        statusCode
      });
      
    case 401:
      return new AuthError(message || 'Unauthorized', {
        ...options,
        statusCode
      });
      
    case 403:
      return new PermissionError(message || 'Forbidden', {
        ...options,
        statusCode
      });
      
    case 404:
      return new NotFoundError(message || 'Not found', {
        ...options,
        statusCode
      });
      
    case 408:
      return new TimeoutError(message || 'Request timeout', {
        ...options,
        statusCode
      });
      
    case 429:
      return new RateLimitError(message || 'Too many requests', {
        ...options,
        statusCode
      });
      
    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError(message || 'Server error', {
        ...options,
        statusCode,
        retryable: options.retryable !== undefined ? options.retryable : true
      });
      
    default:
      return new BaseError(message || 'Error', {
        ...options,
        statusCode
      });
  }
}

/**
 * Check if an error is retryable
 * @param error Error to check
 * @returns True if the error is retryable
 */
export function isRetryable(error: unknown): boolean {
  // Convert to BaseError
  const baseError = toBaseError(error);
  
  // Check retryable flag
  if (baseError.retryable !== undefined) {
    return baseError.retryable;
  }
  
  // Check by category
  switch (baseError.category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.RATE_LIMIT:
      return true;
      
    case ErrorCategory.AUTH:
    case ErrorCategory.PERMISSION:
    case ErrorCategory.VALIDATION:
    case ErrorCategory.CONFIG:
      return false;
      
    case ErrorCategory.DATABASE:
      // Some database errors are retryable (e.g., deadlocks)
      return baseError.code === 'deadlock' || baseError.code === 'connection_error';
      
    default:
      // Check by status code
      if (baseError.statusCode) {
        // 5xx errors are generally retryable
        if (baseError.statusCode >= 500 && baseError.statusCode < 600) {
          return true;
        }
        
        // 408 (timeout) and 429 (rate limit) are retryable
        if (baseError.statusCode === 408 || baseError.statusCode === 429) {
          return true;
        }
      }
      
      return false;
  }
}

/**
 * Get a user-friendly error message
 * @param error Error to get message for
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  // Convert to BaseError
  const baseError = toBaseError(error);
  
  // Check by category
  switch (baseError.category) {
    case ErrorCategory.NETWORK:
      return 'N�o foi poss�vel conectar ao servidor. Verifique sua conex�o com a internet e tente novamente.';
      
    case ErrorCategory.AUTH:
      return 'Erro de autentica��o. Verifique suas credenciais e tente novamente.';
      
    case ErrorCategory.PERMISSION:
      return 'Voc� n�o tem permiss�o para realizar esta a��o.';
      
    case ErrorCategory.VALIDATION:
      return 'Os dados fornecidos s�o inv�lidos. Verifique os campos e tente novamente.';
      
    case ErrorCategory.RATE_LIMIT:
      return 'Muitas solicita��es. Aguarde um momento e tente novamente.';
      
    case ErrorCategory.CONFIG:
      return 'Erro de configura��o. Entre em contato com o suporte.';
      
    case ErrorCategory.DATABASE:
      return 'Erro no banco de dados. Tente novamente mais tarde.';
      
    default:
      return 'Ocorreu um erro. Tente novamente mais tarde.';
  }
}
