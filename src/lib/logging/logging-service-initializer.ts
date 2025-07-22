import { ConsoleTransport } from './logging-service';
import { EnhancedLoggingService, getEnhancedLoggingService } from './enhanced-logging-service';
import { FileLogTransport } from './file-transport';
import { SupabaseLogTransport } from './supabase-transport';
import { getLoggingConfig, LoggingConfig } from './logging-config';
import { getErrorLogger } from './error-logger';

/**
 * Initialize the logging service
 * @param config Logging configuration
 * @returns Enhanced logging service instance
 */
export function initializeLoggingService(config?: LoggingConfig): EnhancedLoggingService {
  // Get configuration
  const loggingConfig = config || getLoggingConfig();
  
  // Get logging service
  const loggingService = getEnhancedLoggingService();
  
  // Clear existing transports
  loggingService.clearTransports();
  
  // Add console transport if enabled
  if (loggingConfig.console.enabled) {
    loggingService.addTransport(new ConsoleTransport({
      minLevel: loggingConfig.console.level,
      includeTimestamp: loggingConfig.console.includeTimestamp,
      includeLoggerName: loggingConfig.console.includeLoggerName
    }));
  }
  
  // Add file transport if enabled
  if (loggingConfig.file.enabled) {
    loggingService.addTransport(new FileLogTransport({
      filePath: loggingConfig.file.filePath,
      minLevel: loggingConfig.file.level,
      maxFileSize: loggingConfig.file.maxFileSize,
      maxFiles: loggingConfig.file.maxFiles
    }));
  }
  
  // Add Supabase transport if enabled
  if (loggingConfig.supabase.enabled && loggingConfig.supabase.url && loggingConfig.supabase.key) {
    loggingService.addTransport(new SupabaseLogTransport({
      supabaseUrl: loggingConfig.supabase.url,
      supabaseKey: loggingConfig.supabase.key,
      tableName: loggingConfig.supabase.tableName,
      minLevel: loggingConfig.supabase.level,
      maxBufferSize: loggingConfig.supabase.maxBufferSize,
      flushIntervalMs: loggingConfig.supabase.flushIntervalMs
    }));
  }
  
  // Initialize error logger
  getErrorLogger({
    includeStack: loggingConfig.error.includeStack,
    includeCause: loggingConfig.error.includeCause
  });
  
  return loggingService;
}

// Tipo mínimo para request usado no skip function
type RequestLike = { path: string };

/**
 * Create request logger middleware skip function
 * @param config Logging configuration
 * @returns Skip function
 */
export function createRequestLoggerSkipFunction(config?: LoggingConfig): (req: RequestLike) => boolean {
  // Get configuration
  const loggingConfig = config || getLoggingConfig();
  
  // Create skip function
  return (req: RequestLike) => {
    // Skip if path is in exclude list
    if (loggingConfig.request.excludePaths.some(path => {
      if (path.endsWith('*')) {
        return req.path.startsWith(path.slice(0, -1));
      }
      return req.path === path;
    })) {
      return true;
    }
    
    return false;
  };
}