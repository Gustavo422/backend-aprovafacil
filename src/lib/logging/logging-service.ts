/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  /**
   * Log level
   */
  level: LogLevel;
  
  /**
   * Log message
   */
  message: string;
  
  /**
   * Logger name
   */
  name: string;
  
  /**
   * Timestamp
   */
  timestamp: Date;
  
  /**
   * Additional metadata
   */
  meta?: Record<string, unknown>;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  /**
   * Log a message
   * @param entry Log entry
   */
  log(entry: LogEntry): void;
}

/**
 * Console log transport
 */
export class ConsoleTransport implements LogTransport {
  /**
   * Create a new console transport
   * @param options Transport options
   */
  constructor(
    private readonly options: {
      /**
       * Minimum log level
       */
      minLevel?: LogLevel;
      
      /**
       * Whether to include timestamp in log messages
       */
      includeTimestamp?: boolean;
      
      /**
       * Whether to include logger name in log messages
       */
      includeLoggerName?: boolean;
      
      /**
       * Format function for log messages
       */
      format?: (entry: LogEntry) => string;
    } = {},
  ) {
    // Set default options
    this.options = {
      minLevel: LogLevel.DEBUG,
      includeTimestamp: true,
      includeLoggerName: true,
      format: this.defaultFormat,
      ...options,
    };
  }
  
  /**
   * Log a message
   * @param entry Log entry
   */
  log(entry: LogEntry): void {
    // Check if log level is enabled
    if (!this.isLevelEnabled(entry.level)) {
      return;
    }
    
    // Format log message
    const format = this.options.format ?? this.defaultFormat;
    const message = format(entry);
    const meta = entry.meta && Object.keys(entry.meta).length > 0 ? entry.meta : undefined;
    
    // Log to console
    switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message, meta);
      break;
    case LogLevel.INFO:
      console.info(message, meta);
      break;
    case LogLevel.WARN:
      console.warn(message, meta);
      break;
    case LogLevel.ERROR:
      console.error(message, meta);
      break;
    case LogLevel.SILENT:
      // Do nothing for silent level
      break;
    }
  }
  
  /**
   * Check if a log level is enabled
   * @param level Log level to check
   * @returns True if the log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SILENT];
    const minLevel = this.options.minLevel ?? LogLevel.DEBUG;
    const minLevelIndex = levels.indexOf(minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
  
  /**
   * Default format function
   * @param entry Log entry
   * @returns Formatted log message
   */
  private readonly defaultFormat = (entry: LogEntry): string => {
    const parts: string[] = [];
    
    // Add timestamp
    if (this.options.includeTimestamp) {
      parts.push(entry.timestamp.toISOString());
    }
    // Add log level
    parts.push(entry.level);
    // Add logger name
    if (this.options.includeLoggerName && entry.name) {
      parts.push(entry.name);
    }
    
    // Add message
    parts.push(entry.message);
    
    return parts.join(' ');
  };
}

/**
 * Memory log transport
 */
export class MemoryTransport implements LogTransport {
  /**
   * Log entries
   */
  private entries: LogEntry[] = [];
  
  /**
   * Maximum number of entries to keep
   */
  private readonly maxEntries: number;
  
  /**
   * Create a new memory transport
   * @param options Transport options
   */
  constructor(
    private readonly options: {
      /**
       * Minimum log level
       */
      minLevel?: LogLevel;
      
      /**
       * Maximum number of entries to keep
       */
      maxEntries?: number;
    } = {},
  ) {
    // Set default options
    this.options = {
      minLevel: LogLevel.DEBUG,
      maxEntries: 1000,
      ...options,
    };
    
    this.maxEntries = this.options.maxEntries || 1000;
  }
  
  /**
   * Log a message
   * @param entry Log entry
   */
  log(entry: LogEntry): void {
    // Check if log level is enabled
    if (!this.isLevelEnabled(entry.level)) {
      return;
    }
    
    // Add entry
    this.entries.push(entry);
    
    // Trim entries if needed
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
  
  /**
   * Get all log entries
   * @returns Log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }
  
  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }
  
  /**
   * Check if a log level is enabled
   * @param level Log level to check
   * @returns True if the log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SILENT];
    const minLevel = this.options.minLevel ?? LogLevel.DEBUG;
    const minLevelIndex = levels.indexOf(minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
}

/**
 * Logger interface
 */
export interface Logger {
  /**
   * Log a debug message
   * @param message Message to log
   * @param meta Additional metadata
   */
  debug(message: string, meta?: Record<string, unknown>): void;
  
  /**
   * Log an info message
   * @param message Message to log
   * @param meta Additional metadata
   */
  info(message: string, meta?: Record<string, unknown>): void;
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param meta Additional metadata
   */
  warn(message: string, meta?: Record<string, unknown>): void;
  
  /**
   * Log an error message
   * @param message Message to log
   * @param meta Additional metadata
   */
  error(message: string, meta?: Record<string, unknown>): void;
  
  /**
   * Create a child logger with additional context
   * @param context Additional context
   * @returns Child logger
   */
  child(context: Record<string, unknown>): Logger;
}

/**
 * Logger implementation
 */
export class LoggerImpl implements Logger {
  /**
   * Create a new logger
   * @param name Logger name
   * @param transports Log transports
   * @param context Logger context
   */
  constructor(
    private readonly name: string,
    private readonly transports: LogTransport[] = [],
    private readonly context: Record<string, unknown> = {},
  ) {}
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param meta Additional metadata
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param meta Additional metadata
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param meta Additional metadata
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param meta Additional metadata
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }
  
  /**
   * Create a child logger with additional context
   * @param context Additional context
   * @returns Child logger
   */
  child(context: Record<string, unknown>): Logger {
    return new LoggerImpl(
      this.name,
      this.transports,
      { ...this.context, ...context },
    );
  }
  
  /**
   * Log a message
   * @param level Log level
   * @param message Message to log
   * @param meta Additional metadata
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      name: this.name,
      timestamp: new Date(),
      meta: { ...this.context, ...meta },
    };
    
    // Log to all transports
    for (const transport of this.transports) {
      transport.log(entry);
    }
  }
}

/**
 * Logging service
 */
export class LoggingService {
  /**
   * Log transports
   */
  private readonly transports: LogTransport[] = [];
  
  /**
   * Loggers
   */
  private readonly loggers = new Map<string, Logger>();
  
  /**
   * Create a new logging service
   */
  constructor() {
    // Add default console transport
    this.addTransport(new ConsoleTransport());
  }
  
  /**
   * Add a log transport
   * @param transport Log transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }
  
  /**
   * Get a logger
   * @param name Logger name
   * @param context Logger context
   * @returns Logger instance
   */
  getLogger(name: string, context: Record<string, unknown> = {}): Logger {
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
    
    // Create new logger
    const logger = new LoggerImpl(name, this.transports, context);
    
    // Store logger
    this.loggers.set(name, logger);
    
    return logger;
  }
}

/**
 * Singleton instance of the logging service
 */
let instance: LoggingService | null = null;

/**
 * Get the singleton instance of the logging service
 * @returns Logging service instance
 */
export function getLoggingService(): LoggingService {
  if (!instance) {
    instance = new LoggingService();
  }
  
  return instance;
}

/**
 * Get a logger
 * @param name Logger name
 * @param context Logger context
 * @returns Logger instance
 */
export function getLogger(name: string, context: Record<string, unknown> = {}): Logger {
  return getLoggingService().getLogger(name, context);
}
