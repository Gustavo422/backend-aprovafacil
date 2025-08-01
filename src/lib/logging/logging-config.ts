import { LogLevel } from './logging-service.js';

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  /**
   * Default log level
   */
  defaultLevel: LogLevel;
  
  /**
   * Console logging configuration
   */
  console: {
    /**
     * Whether console logging is enabled
     */
    enabled: boolean;
    
    /**
     * Console log level
     */
    level: LogLevel;
    
    /**
     * Whether to include timestamp in console logs
     */
    includeTimestamp: boolean;
    
    /**
     * Whether to include logger name in console logs
     */
    includeLoggerName: boolean;
    
    /**
     * Whether to use colors in console logs
     */
    useColors: boolean;
  };
  
  /**
   * File logging configuration
   */
  file: {
    /**
     * Whether file logging is enabled
     */
    enabled: boolean;
    
    /**
     * File log level
     */
    level: LogLevel;
    
    /**
     * Log file path
     */
    filePath: string;
    
    /**
     * Maximum file size in bytes
     */
    maxFileSize: number;
    
    /**
     * Maximum number of rotated files
     */
    maxFiles: number;
  };
  
  /**
   * Supabase logging configuration
   */
  supabase: {
    /**
     * Whether Supabase logging is enabled
     */
    enabled: boolean;
    
    /**
     * Supabase log level
     */
    level: LogLevel;
    
    /**
     * Supabase URL
     */
    url: string;
    
    /**
     * Supabase API key
     */
    key: string;
    
    /**
     * Table name
     */
    tableName: string;
    
    /**
     * Maximum buffer size
     */
    maxBufferSize: number;
    
    /**
     * Flush interval in milliseconds
     */
    flushIntervalMs: number;
  };
  
  /**
   * Request logging configuration
   */
  request: {
    /**
     * Whether request logging is enabled
     */
    enabled: boolean;
    
    /**
     * Whether to log request body
     */
    logBody: boolean;
    
    /**
     * Whether to log request headers
     */
    logHeaders: boolean;
    
    /**
     * Whether to log response body
     */
    logResponseBody: boolean;
    
    /**
     * Whether to log response time
     */
    logResponseTime: boolean;
    
    /**
     * Headers to exclude from logging
     */
    excludeHeaders: string[];
    
    /**
     * Paths to exclude from logging
     */
    excludePaths: string[];
  };
  
  /**
   * Error logging configuration
   */
  error: {
    /**
     * Whether to include stack trace
     */
    includeStack: boolean;
    
    /**
     * Whether to include cause chain
     */
    includeCause: boolean;
  };
}

/**
 * Default logging configuration
 */
export const defaultLoggingConfig: LoggingConfig = {
  defaultLevel: LogLevel.INFO,
  console: {
    enabled: true,
    level: LogLevel.INFO,
    includeTimestamp: true,
    includeLoggerName: true,
    useColors: true,
  },
  file: {
    enabled: false,
    level: LogLevel.INFO,
    filePath: 'logs/app.log',
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
  },
  supabase: {
    enabled: false,
    level: LogLevel.INFO,
    url: '',
    key: '',
    tableName: 'logs',
    maxBufferSize: 100,
    flushIntervalMs: 10000,
  },
  request: {
    enabled: true,
    logBody: false,
    logHeaders: false,
    logResponseBody: false,
    logResponseTime: true,
    excludeHeaders: ['authorization', 'cookie', 'set-cookie'],
    excludePaths: ['/health', '/metrics'],
  },
  error: {
    includeStack: true,
    includeCause: true,
  },
};

/**
 * Load logging configuration from environment variables
 * @returns Logging configuration
 */
export function loadLoggingConfigFromEnv(): LoggingConfig {
  const config = { ...defaultLoggingConfig };
  
  // Default level
  if (process.env.LOG_LEVEL) {
    config.defaultLevel = process.env.LOG_LEVEL as LogLevel;
  }
  
  // Console logging
  if (process.env.LOG_CONSOLE_ENABLED) {
    config.console.enabled = process.env.LOG_CONSOLE_ENABLED === 'true';
  }
  if (process.env.LOG_CONSOLE_LEVEL) {
    config.console.level = process.env.LOG_CONSOLE_LEVEL as LogLevel;
  }
  if (process.env.LOG_CONSOLE_TIMESTAMP) {
    config.console.includeTimestamp = process.env.LOG_CONSOLE_TIMESTAMP === 'true';
  }
  if (process.env.LOG_CONSOLE_LOGGER_NAME) {
    config.console.includeLoggerName = process.env.LOG_CONSOLE_LOGGER_NAME === 'true';
  }
  if (process.env.LOG_CONSOLE_COLORS) {
    config.console.useColors = process.env.LOG_CONSOLE_COLORS === 'true';
  }
  
  // File logging
  if (process.env.LOG_FILE_ENABLED) {
    config.file.enabled = process.env.LOG_FILE_ENABLED === 'true';
  }
  if (process.env.LOG_FILE_LEVEL) {
    config.file.level = process.env.LOG_FILE_LEVEL as LogLevel;
  }
  if (process.env.LOG_FILE_PATH) {
    config.file.filePath = process.env.LOG_FILE_PATH;
  }
  if (process.env.LOG_FILE_MAX_SIZE) {
    config.file.maxFileSize = parseInt(process.env.LOG_FILE_MAX_SIZE, 10);
  }
  if (process.env.LOG_FILE_MAX_FILES) {
    config.file.maxFiles = parseInt(process.env.LOG_FILE_MAX_FILES, 10);
  }
  
  // Supabase logging
  if (process.env.LOG_SUPABASE_ENABLED) {
    config.supabase.enabled = process.env.LOG_SUPABASE_ENABLED === 'true';
  }
  if (process.env.LOG_SUPABASE_LEVEL) {
    config.supabase.level = process.env.LOG_SUPABASE_LEVEL as LogLevel;
  }
  if (process.env.SUPABASE_URL) {
    config.supabase.url = process.env.SUPABASE_URL;
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    config.supabase.key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (process.env.LOG_SUPABASE_TABLE) {
    config.supabase.tableName = process.env.LOG_SUPABASE_TABLE;
  }
  if (process.env.LOG_SUPABASE_BUFFER_SIZE) {
    config.supabase.maxBufferSize = parseInt(process.env.LOG_SUPABASE_BUFFER_SIZE, 10);
  }
  if (process.env.LOG_SUPABASE_FLUSH_INTERVAL) {
    config.supabase.flushIntervalMs = parseInt(process.env.LOG_SUPABASE_FLUSH_INTERVAL, 10);
  }
  
  // Request logging
  if (process.env.LOG_REQUEST_ENABLED) {
    config.request.enabled = process.env.LOG_REQUEST_ENABLED === 'true';
  }
  if (process.env.LOG_REQUEST_BODY) {
    config.request.logBody = process.env.LOG_REQUEST_BODY === 'true';
  }
  if (process.env.LOG_REQUEST_HEADERS) {
    config.request.logHeaders = process.env.LOG_REQUEST_HEADERS === 'true';
  }
  if (process.env.LOG_RESPONSE_BODY) {
    config.request.logResponseBody = process.env.LOG_RESPONSE_BODY === 'true';
  }
  if (process.env.LOG_RESPONSE_TIME) {
    config.request.logResponseTime = process.env.LOG_RESPONSE_TIME === 'true';
  }
  if (process.env.LOG_EXCLUDE_HEADERS) {
    config.request.excludeHeaders = process.env.LOG_EXCLUDE_HEADERS.split(',');
  }
  if (process.env.LOG_EXCLUDE_PATHS) {
    config.request.excludePaths = process.env.LOG_EXCLUDE_PATHS.split(',');
  }
  
  // Error logging
  if (process.env.LOG_ERROR_STACK) {
    config.error.includeStack = process.env.LOG_ERROR_STACK === 'true';
  }
  if (process.env.LOG_ERROR_CAUSE) {
    config.error.includeCause = process.env.LOG_ERROR_CAUSE === 'true';
  }
  
  return config;
}

/**
 * Singleton instance of the logging configuration
 */
let instance: LoggingConfig | null = null;

/**
 * Get the singleton instance of the logging configuration
 * @returns Logging configuration instance
 */
export function getLoggingConfig(): LoggingConfig {
  if (!instance) {
    instance = loadLoggingConfigFromEnv();
  }
  
  return instance;
}

/**
 * Set the logging configuration
 * @param config Logging configuration
 */
export function setLoggingConfig(config: Partial<LoggingConfig>): void {
  instance = {
    ...getLoggingConfig(),
    ...config,
    console: {
      ...getLoggingConfig().console,
      ...(config.console || {}),
    },
    file: {
      ...getLoggingConfig().file,
      ...(config.file || {}),
    },
    supabase: {
      ...getLoggingConfig().supabase,
      ...(config.supabase || {}),
    },
    request: {
      ...getLoggingConfig().request,
      ...(config.request || {}),
    },
    error: {
      ...getLoggingConfig().error,
      ...(config.error || {}),
    },
  };
}