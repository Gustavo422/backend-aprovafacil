/**
 * This file demonstrates how to use the enhanced logging service in the application.
 * It is not meant to be imported directly, but rather serves as a reference.
 */

import express from 'express';
import {
  getEnhancedLogger,
  initializeLoggingService,
  createRequestLoggerMiddleware,
  createRequestLoggerSkipFunction,
  getErrorLogger,
} from './index';

/**
 * Example of initializing the logging service in the application
 */
export function initializeLogging() {
  // Initialize the logging service with default configuration
  initializeLoggingService();
  
  // Get a logger for the current module
  const logger = getEnhancedLogger('app');
  
  logger.info('Logging service initialized');
}

/**
 * Example of using the request logger middleware in Express
 */
export function setupExpressLogging(app: express.Application) {
  // Create request logger middleware
  const requestLogger = createRequestLoggerMiddleware({
    logBody: true,
    logHeaders: true,
    logResponseTime: true,
    skip: createRequestLoggerSkipFunction()
  });
  
  // Add middleware to Express
  app.use(requestLogger);
}

/**
 * Example of using the logger in a service
 */
export class ExampleService {
  // Create a logger for the service
  private logger = getEnhancedLogger('ExampleService');
  
  constructor() {
    this.logger.info('ExampleService initialized');
  }
  
  /**
   * Example method with logging
   */
  async processItem(id: string, data: unknown) {
    // Create a child logger with context
    const logger = this.logger.child({
      itemId: id,
      operation: 'processItem'
    });
    
    logger.info('Processing item', { dataSize: JSON.stringify(data).length });
    
    try {
      // Start a timer
      const timer = logger.startTimer('processItem');
      
      // Do some work...
      await this.doSomeWork(data);
      
      // Log success and stop timer
      const duration = timer.stop();
      logger.info(`Item processed successfully in ${duration}ms`);
      
      return { success: true };
    } catch (error) {
      // Log error
      logger.error('Failed to process item', { error: error.message }, error);
      
      // Use error logger for detailed error logging
      const errorLogger = getErrorLogger();
      errorLogger.logError(error, `Failed to process item ${id}`);
      
      throw error;
    }
  }
  
  /**
   * Example private method
   */
  private async doSomeWork(data: unknown): Promise<void> {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log debug information
    this.logger.debug('Work completed', { data });
  }
}

/**
 * Example of using the logger in different scenarios
 */
export function loggingExamples() {
  // Get a logger
  const logger = getEnhancedLogger('examples');
  
  // Basic logging
  logger.debug('This is a debug message');
  logger.info('This is an info message');
  logger.warn('This is a warning message');
  logger.error('This is an error message');
  
  // Logging with metadata
  logger.info('User logged in', { userId: '123', role: 'admin' });
  
  // Logging with context
  const userLogger = logger.child({ userId: '123', sessionId: 'abc123' });
  userLogger.info('User performed an action');
  
  // Logging errors
  try {
    throw new Error('Something went wrong');
  } catch (error) {
    logger.error('An error occurred', { operation: 'example' }, error);
    
    // Use error logger
    const errorLogger = getErrorLogger();
    errorLogger.logError(error, 'Example error');
  }
  
  // Timing operations
  const timer = logger.startTimer('example-operation');
  // Do some work...
  const duration = timer.stop();
  logger.info(`Operation completed in ${duration}ms`);
}

/**
 * Example of using the logger in a request handler
 */
export function exampleRequestHandler(req: express.Request, res: express.Response) {
  // Get a logger with request context
  const logger = getEnhancedLogger('api:example').child({
    requestId: req.headers['x-request-id'] as string,
    userId: (req.user as { id: string } | undefined)?.id,
    path: req.path
  });
  
  logger.info('Processing request');
  
  try {
    // Process request...
    
    logger.info('Request processed successfully');
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing request', { error: error.message }, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}