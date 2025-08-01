import { LogEntry, LogLevel, LogTransport, Logger } from './logging-service.js';

/**
 * Log context interface
 */
export interface LogContext {
  /**
   * Request ID
   */
  requestId?: string;
  
  /**
   * User ID
   */
  usuarioId?: string;
  
  /**
   * Session ID
   */
  sessionId?: string;
  
  /**
   * Component name
   */
  component?: string;
  
  /**
   * Operation name
   */
  operation?: string;
  
  /**
   * Additional context data
   */
  [key: string]: unknown;
}

/**
 * Enhanced log entry interface
 */
export interface EnhancedLogEntry extends LogEntry {
  /**
   * Log context
   */
  context: LogContext;
  
  /**
   * Error object (if applicable)
   */
  error?: Error;
  
  /**
   * Stack trace (if applicable)
   */
  stack?: string;
  
  /**
   * Source file
   */
  source?: {
    /**
     * File name
     */
    file?: string;
    
    /**
     * Line number
     */
    line?: number;
    
    /**
     * Function name
     */
    function?: string;
  };
}

/**
 * Enhanced logger interface
 */
export interface EnhancedLogger extends Logger {
  /**
   * Log a debug message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  debug(message: string, meta?: Record<string, unknown>, error?: Error): void;
  
  /**
   * Log an info message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  info(message: string, meta?: Record<string, unknown>, error?: Error): void;
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  warn(message: string, meta?: Record<string, unknown>, error?: Error): void;
  
  /**
   * Log an error message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  error(message: string, meta?: Record<string, unknown>, error?: Error): void;
  
  /**
   * Create a child logger with additional context
   * @param context Additional context
   * @returns Child logger
   */
  child(context: LogContext): EnhancedLogger;
  
  /**
   * Set context for the logger
   * @param context Context to set
   */
  setContext(context: LogContext): void;
  
  /**
   * Get current context
   * @returns Current context
   */
  getContext(): LogContext;
  
  /**
   * Start timing an operation
   * @param operation Operation name
   * @returns Timer object
   */
  startTimer(operation: string): { stop: () => number };
}

/**
 * Enhanced logger implementation
 */
export class EnhancedLoggerImpl implements EnhancedLogger {
  /**
   * Create a new enhanced logger
   * @param name Logger name
   * @param transports Log transports
   * @param context Logger context
   */
  constructor(
    private readonly name: string,
    private readonly transports: LogTransport[] = [],
    private context: LogContext = {},
  ) {}
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  debug(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, meta, error);
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  info(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.INFO, message, meta, error);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  warn(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, message, meta, error);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  error(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, meta, error);
  }
  
  /**
   * Create a child logger with additional context
   * @param context Additional context
   * @returns Child logger
   */
  child(context: LogContext): EnhancedLogger {
    return new EnhancedLoggerImpl(
      this.name,
      this.transports,
      { ...this.context, ...context },
    );
  }
  
  /**
   * Set context for the logger
   * @param context Context to set
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }
  
  /**
   * Get current context
   * @returns Current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }
  
  /**
   * Start timing an operation
   * @param operation Operation name
   * @returns Timer object
   */
  startTimer(operation: string): { stop: () => number } {
    const start = Date.now();
    
    return {
      stop: () => {
        const duration = Date.now() - start;
        this.info(`Operation ${operation} completed in ${duration}ms`, {
          operation,
          duration,
        });
        return duration;
      },
    };
  }
  
  /**
   * Log a message
   * @param level Log level
   * @param message Message to log
   * @param meta Additional metadata
   * @param error Error object
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: Error): void {
    // Get stack trace
    const stack = error?.stack || new Error().stack?.split('\n').slice(2).join('\n');
    
    // Parse source information from stack trace
    const source = this.parseSourceFromStack(stack);
    
    // Create enhanced log entry
    const entry: EnhancedLogEntry = {
      level,
      message,
      name: this.name,
      timestamp: new Date(),
      meta: { ...meta },
      context: { ...this.context },
      error,
      stack,
      source,
    };
    
    // Log to all transports
    for (const transport of this.transports) {
      transport.log(entry);
    }
  }
  
  /**
   * Parse source information from stack trace
   * @param stack Stack trace
   * @returns Source information
   */
  private parseSourceFromStack(stack?: string): EnhancedLogEntry['source'] {
    if (!stack) {
      return undefined;
    }
    
    // Parse stack trace
    const stackLines = stack.split('\n');
    if (stackLines.length < 2) {
      return undefined;
    }
    
    // Get first line after logger methods
    let line = stackLines[0];
    for (let i = 0; i < stackLines.length; i++) {
      if (!stackLines[i].includes('EnhancedLoggerImpl') && 
          !stackLines[i].includes('LoggerImpl') &&
          !stackLines[i].includes('at Object.log')) {
        line = stackLines[i];
        break;
      }
    }
    
    // Parse line
    const match = line.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);
    if (!match) {
      return undefined;
    }
    
    // Extract information
    const functionName = match[1] || undefined;
    const fileName = match[2] || match[5] || undefined;
    const lineNumber = match[3] ? parseInt(match[3], 10) : undefined;
    
    return {
      file: fileName,
      line: lineNumber,
      function: functionName,
    };
  }
}

/**
 * Enhanced logging service
 */
export class EnhancedLoggingService {
  /**
   * Log transports
   */
  private readonly transports: LogTransport[] = [];
  
  /**
   * Loggers
   */
  private readonly loggers = new Map<string, EnhancedLogger>();
  
  /**
   * Global context
   */
  private globalContext: LogContext = {};
  
  /**
   * Create a new enhanced logging service
   */
  constructor() {}
  
  /**
   * Add a log transport
   * @param transport Log transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }
  
  /**
   * Remove a log transport
   * @param transport Log transport to remove
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }
  
  /**
   * Clear all transports
   */
  clearTransports(): void {
    this.transports.length = 0;
  }
  
  /**
   * Set global context
   * @param context Global context
   */
  setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }
  
  /**
   * Get global context
   * @returns Global context
   */
  getGlobalContext(): LogContext {
    return { ...this.globalContext };
  }
  
  /**
   * Get a logger
   * @param name Logger name
   * @param context Logger context
   * @returns Logger instance
   */
  getLogger(name: string, context: LogContext = {}): EnhancedLogger {
    // Check if logger already exists
    if (this.loggers.has(name)) {
      const logger = this.loggers.get(name);
      
      if (logger) {
        // If context is provided, create a child logger
        if (Object.keys(context).length > 0) {
          return logger.child(context);
        }
        
        return logger;
      }
    }
    
    // Create new logger with global context
    const logger = new EnhancedLoggerImpl(
      name,
      this.transports,
      { ...this.globalContext, ...context },
    );
    
    // Store logger
    this.loggers.set(name, logger);
    
    return logger;
  }
}

/**
 * Singleton instance of the enhanced logging service
 */
let instance: EnhancedLoggingService | null = null;

/**
 * Get the singleton instance of the enhanced logging service
 * @returns Enhanced logging service instance
 */
export function getEnhancedLoggingService(): EnhancedLoggingService {
  if (!instance) {
    instance = new EnhancedLoggingService();
  }
  
  return instance;
}

/**
 * Get an enhanced logger
 * @param name Logger name
 * @param context Logger context
 * @returns Enhanced logger instance
 */
export function getEnhancedLogger(name: string, context: LogContext = {}): EnhancedLogger {
  return getEnhancedLoggingService().getLogger(name, context);
}