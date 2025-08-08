import type { EnhancedLogger} from './enhanced-logging-service.js';
import { getEnhancedLogger } from './enhanced-logging-service.js';

/**
 * Error logger options
 */
export interface ErrorLoggerOptions {
  /**
   * Logger instance
   */
  logger?: EnhancedLogger;
  
  /**
   * Whether to include stack trace
   */
  includeStack?: boolean;
  
  /**
   * Whether to include cause chain
   */
  includeCause?: boolean;
  
  /**
   * Additional context to include
   */
  context?: Record<string, unknown>;
}

/**
 * Error logger
 */
export class ErrorLogger {
  /**
   * Logger instance
   */
  private readonly logger: EnhancedLogger;
  
  /**
   * Whether to include stack trace
   */
  private readonly includeStack: boolean;
  
  /**
   * Whether to include cause chain
   */
  private readonly includeCause: boolean;
  
  /**
   * Additional context
   */
  private readonly context: Record<string, unknown>;
  
  /**
   * Create a new error logger
   * @param options Error logger options
   */
  constructor(options: ErrorLoggerOptions = {}) {
    this.logger = options.logger ?? getEnhancedLogger('error');
    this.includeStack = options.includeStack ?? true;
    this.includeCause = options.includeCause ?? true;
    this.context = options.context ?? {};
  }
  
  /**
   * Log an error
   * @param error Error to log
   * @param message Optional message
   * @param context Additional context
   */
  logError(error: Error, message?: string, context?: Record<string, unknown>): void {
    // Create error context
    const errorContext = {
      ...this.context,
      ...context,
      error: {
        name: error.name,
        message: error.message,
      },
    };
    
    // Add stack trace if enabled
    if (this.includeStack && error.stack) {
      Object.assign(errorContext.error, { stack: error.stack });
    }
    
    // Add cause chain if enabled
    if (this.includeCause && 'cause' in error) {
      const causes: Array<{ name: string; message: string; stack?: string }> = [];
      let currentCause: unknown = (error as { cause?: unknown }).cause;
      while (currentCause) {
        const causeInfo: { name: string; message: string; stack?: string } = {
          name: 'Unknown',
          message: '',
        };
        if (typeof currentCause === 'object' && currentCause !== null) {
          if ('name' in currentCause && typeof (currentCause as { name?: unknown }).name === 'string') {
            causeInfo.name = (currentCause as { name?: string }).name ?? 'Unknown';
          }
          if ('message' in currentCause && typeof (currentCause as { message?: unknown }).message === 'string') {
            causeInfo.message = (currentCause as { message?: string }).message ?? '';
          }
          if ('stack' in currentCause && typeof (currentCause as { stack?: unknown }).stack === 'string') {
            causeInfo.stack = (currentCause as { stack?: string }).stack;
          }
        }
        causes.push(causeInfo);
        currentCause = (currentCause as { cause?: unknown }).cause;
      }
      if (causes.length > 0) {
        Object.assign(errorContext.error, { causes });
      }
    }
    
    // Log the error
    this.logger.error(message ?? error.message, errorContext, error);
  }
  
  /**
   * Log an error with additional context
   * @param error Error to log
   * @param context Additional context
   */
  logErrorWithContext(error: Error, context: Record<string, unknown>): void {
    this.logError(error, undefined, context);
  }
  
  /**
   * Create a child error logger with additional context
   * @param context Additional context
   * @returns Child error logger
   */
  child(context: Record<string, unknown>): ErrorLogger {
    return new ErrorLogger({
      logger: this.logger,
      includeStack: this.includeStack,
      includeCause: this.includeCause,
      context: { ...this.context, ...context },
    });
  }
}

/**
 * Get an error logger instance
 * @param options Error logger options
 * @returns Error logger instance
 */
export function getErrorLogger(options: ErrorLoggerOptions = {}): ErrorLogger {
  return new ErrorLogger(options);
}