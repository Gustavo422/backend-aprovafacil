// Base error classes
export { BaseError } from './base-error';
export { ErrorCategory } from './error-category';
export {
  AuthError,
  ConfigError,
  DatabaseError,
  NetworkError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  TimeoutError,
  ValidationError
} from './error-types';

// Error utilities
export * from './error-utils';
