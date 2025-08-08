import type { LogEntry, LogTransport, Logger } from './logging-service.js';
import { LogLevel } from './logging-service.js';

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
  private readonly startTime: number;
  private readonly timers = new Map<string, number>();

  constructor(
    private readonly name: string,
    private readonly transports: LogTransport[] = [],
    private context: LogContext = {},
  ) {
    this.startTime = Date.now();
  }

  debug(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.DEBUG, message, meta, error);
  }

  info(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.INFO, message, meta, error);
  }

  warn(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, message, meta, error);
  }

  error(message: string, meta?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, meta, error);
  }

  child(context: LogContext): EnhancedLogger {
    const childContext = { ...this.context, ...context };
    return new EnhancedLoggerImpl(this.name, this.transports, childContext);
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  startTimer(operation: string): { stop: () => number } {
    const startTime = Date.now();
    this.timers.set(operation, startTime);
    
    return {
      stop: () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.timers.delete(operation);
        return duration;
      },
    };
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: Error): void {
    const timestamp = new Date();
    const source = this.parseSourceFromStack(error?.stack);
    
    const logEntry: EnhancedLogEntry = {
      timestamp,
      level,
      message,
      name: this.name,
      meta: { ...this.context, ...meta },
      context: this.context,
      source,
      error,
      stack: error?.stack,
    };

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(logEntry);
      } catch (transportError) {
        console.error('Failed to send log to transport:', transportError);
      }
    }
  }

  private parseSourceFromStack(stack?: string): EnhancedLogEntry['source'] {
    if (!stack) return undefined;

    const lines = stack.split('\n');
    const callerLine = lines.find(line => 
      line.includes('.ts') || line.includes('.js') && !line.includes('node_modules')
    );

    if (!callerLine) return undefined;

    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (!match) return undefined;

    return {
      function: match[1] ?? undefined,
      file: match[2] ?? undefined,
      line: parseInt(match[3] ?? '0', 10),
    };
  }
}

/**
 * Enhanced logging service
 */
export class EnhancedLoggingService {
  private static instance: EnhancedLoggingService;
  private readonly transports: LogTransport[] = [];
  private readonly loggers = new Map<string, EnhancedLogger>();
  private globalContext: LogContext = {};

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): EnhancedLoggingService {
    if (!EnhancedLoggingService.instance) {
      EnhancedLoggingService.instance = new EnhancedLoggingService();
    }
    return EnhancedLoggingService.instance;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  clearTransports(): void {
    this.transports.length = 0;
  }

  setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  getGlobalContext(): LogContext {
    return { ...this.globalContext };
  }

  getLogger(name: string, context: LogContext = {}): EnhancedLogger {
    const key = `${name}:${JSON.stringify(context)}`;
    
    if (!this.loggers.has(key)) {
      const mergedContext = { ...this.globalContext, ...context };
      const logger = new EnhancedLoggerImpl(name, this.transports, mergedContext);
      this.loggers.set(key, logger);
    }
    
    return this.loggers.get(key)!;
  }
}

/**
 * Get the enhanced logging service instance
 */
export function getEnhancedLoggingService(): EnhancedLoggingService {
  return EnhancedLoggingService.getInstance();
}

/**
 * Get an enhanced logger
 */
export function getEnhancedLogger(name: string, context: LogContext = {}): EnhancedLogger {
  const service = getEnhancedLoggingService();
  return service.getLogger(name, context);
}