/**
 * Enum representing the categories of errors
 */
export enum ErrorCategory {
  /**
   * Authentication-related errors (login, signup, token refresh)
   */
  AUTH = 'auth',
  
  /**
   * Network-related errors (connection timeout, network unavailable)
   */
  NETWORK = 'network',
  
  /**
   * Database query errors (invalid query, constraint violation)
   */
  DATABASE = 'database',
  
  /**
   * Storage-related errors (upload failure, download failure)
   */
  STORAGE = 'storage',
  
  /**
   * Configuration errors (missing API keys, invalid configuration)
   */
  CONFIG = 'config',
  
  /**
   * Rate limiting errors (too many requests)
   */
  RATE_LIMIT = 'rate_limit',
  
  /**
   * Permission errors (insufficient permissions)
   */
  PERMISSION = 'permission',
  
  /**
   * Validation errors (invalid input data)
   */
  VALIDATION = 'validation',
  
  /**
   * Unknown errors that don't fit into other categories
   */
  UNKNOWN = 'unknown'
}
