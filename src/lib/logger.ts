// Re-export das funcionalidades de logging
export {
  LogLevel,
  ConsoleTransport,
  MemoryTransport,
  LoggerImpl,
  LoggingService,
  getLoggingService,
  getLogger,
} from './logging/logging-service.js';

export {
  EnhancedLoggerImpl,
  EnhancedLoggingService,
  getEnhancedLoggingService,
  getEnhancedLogger,
} from './logging/enhanced-logging-service.js';

export {
  createRequestLoggerMiddleware,
} from './logging/request-logger-middleware.js';

export {
  ErrorLogger,
  getErrorLogger,
} from './logging/error-logger.js';

// Export default logger como função
import { getEnhancedLogger } from './logging/enhanced-logging-service.js';
export const logger = getEnhancedLogger('default');