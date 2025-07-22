import { NextRequest, NextResponse } from 'next/server';
import { BaseError } from '@/lib/errors/base-error';
import { ErrorCategory } from '@/lib/errors/error-category';
import { getLogger } from '@/lib/logging';

const logger = getLogger('error-middleware');

/**
 * Middleware for handling errors in API routes
 */
export async function errorHandlerMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Execute the handler
    return await handler();
  } catch (error) {
    // Log the error
    logger.error('API error', { error, url: request.url, method: request.method });
    
    // Convert to BaseError if needed
    const baseError = error instanceof BaseError
      ? error
      : createBaseErrorFromUnknown(error);
    
    // Create error response
    return createErrorResponse(baseError);
  }
}

/**
 * Create a BaseError from an unknown error
 */
function createBaseErrorFromUnknown(error: unknown): BaseError {
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
 * Create an error response from a BaseError
 */
function createErrorResponse(error: BaseError): NextResponse {
  // Determine status code
  const statusCode = error.statusCode || getDefaultStatusCode(error.category);
  
  // Create error response body
  const errorResponse = {
    error: {
      message: error.message,
      code: error.code || getDefaultErrorCode(error.category),
      details: error.details
    }
  };
  
  // Return response
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Get default status code for an error category
 */
function getDefaultStatusCode(category: ErrorCategory): number {
  switch (category) {
    case ErrorCategory.AUTH:
      return 401;
    case ErrorCategory.PERMISSION:
      return 403;
    case ErrorCategory.VALIDATION:
      return 422;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.DATABASE:
      return 500;
    case ErrorCategory.NETWORK:
      return 503;
    case ErrorCategory.CONFIG:
      return 500;
    default:
      return 500;
  }
}

/**
 * Get default error code for an error category
 */
function getDefaultErrorCode(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AUTH:
      return 'unauthorized';
    case ErrorCategory.PERMISSION:
      return 'forbidden';
    case ErrorCategory.VALIDATION:
      return 'validation_error';
    case ErrorCategory.RATE_LIMIT:
      return 'rate_limit_exceeded';
    case ErrorCategory.DATABASE:
      return 'database_error';
    case ErrorCategory.NETWORK:
      return 'network_error';
    case ErrorCategory.CONFIG:
      return 'configuration_error';
    default:
      return 'internal_server_error';
  }
}
