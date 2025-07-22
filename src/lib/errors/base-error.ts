import { ErrorCategory } from './error-category';

/**
 * Base error class with enhanced functionality
 */
export class BaseError extends Error {
  /**
   * Error category for classification
   */
  public readonly category: ErrorCategory;
  
  /**
   * HTTP status code (if applicable)
   */
  public readonly statusCode?: number;
  
  /**
   * Error code for programmatic handling
   */
  public readonly code?: string;
  
  /**
   * Whether the error is retryable
   */
  public readonly retryable: boolean;
  
  /**
   * Additional error details
   */
  public readonly details?: Record<string, unknown>;
  
  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;
  
  /**
   * Original error that caused this error (if any)
   */
  public readonly cause?: Error;
  
  /**
   * Create a new base error
   * @param message Error message
   * @param options Error options
   */
  constructor(
    message: string,
    options: {
      category?: ErrorCategory;
      statusCode?: number;
      code?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    
    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, BaseError.prototype);
    
    // Set error name
    this.name = this.constructor.name;
    
    // Set properties
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.retryable = options.retryable || false;
    this.details = options.details;
    this.timestamp = new Date();
    this.cause = options.cause;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      code: this.code,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
  
  /**
   * Convert error to string
   */
  toString(): string {
    let result = '';
    if (this.code) {
      result += ` (code: ${this.code})`;
    }
    if (this.statusCode) {
      result += ` (status: ${this.statusCode})`;
    }
    return result;
  }
}
