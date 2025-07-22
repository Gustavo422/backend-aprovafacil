// Base API handler and types
export { BaseApiHandler, type ApiResponse, type ApiHandlerOptions } from './base-api-handler';

// Enhanced API handler
export { 
  ApiHandler, 
  createApiHandler, 
  type HttpMethod, 
  type RequestContext, 
  type ApiResponse as EnhancedApiResponse 
} from './api-handler';

// Response formatter utilities
export { ResponseFormatter } from './response-formatter';
export { ResponseUtils } from './response-utils';

// Request validation utilities
export { RequestValidator, type ValidationResult } from './request-validator';
export { ValidationSchemas, ValidationUtils } from './validation-utils';

// Middleware system
export {
  MiddlewareChain,
  requestLoggingMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  authMiddleware,
  authorizationMiddleware,
  contentTypeMiddleware,
  requestSizeLimitMiddleware,
  type MiddlewareFunction,
  type MiddlewareContext,
} from './middleware';

// Authentication middleware
// export {
//   createAuthMiddleware,
//   createRoleMiddleware,
//   createExpressAuthMiddleware,
//   createExpressRoleMiddleware,
//   type AuthOptions,
// } from './auth-middleware';

// Concrete handler implementation
export { ConcreteApiHandler } from './concrete-api-handler';