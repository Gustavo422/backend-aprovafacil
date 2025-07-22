import { Request, Response, NextFunction } from 'express';
import { createDebugger } from '../utils/debugger.js';

// Create a debugger specific for the CSP middleware
const debug = createDebugger('middleware:csp');

/**
 * Content Security Policy options
 */
export interface CSPOptions {
  /**
   * Enable report-only mode (doesn't block content, only reports violations)
   */
  reportOnly?: boolean;
  
  /**
   * URL to report CSP violations to
   */
  reportUri?: string;
  
  /**
   * Custom directives to add to the policy
   */
  directives?: Record<string, string | string[]>;
}

/**
 * Default CSP directives
 */
const defaultDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': []
};

/**
 * Convert CSP directives object to string
 * @param directives CSP directives
 * @returns CSP header value
 */
function directivesToString(directives: Record<string, string | string[]>): string {
  return Object.entries(directives)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${key} ${value.join(' ')}` : key;
      }
      return `${key} ${value}`;
    })
    .join('; ');
}

/**
 * Middleware to set Content Security Policy headers
 * @param options CSP options
 */
export function contentSecurityPolicy(options: CSPOptions = {}) {
  const {
    reportOnly = false,
    reportUri,
    directives: customDirectives = {}
  } = options;
  
  // Merge default and custom directives
  const directives = { ...defaultDirectives };
  
  // Add report-uri if provided
  if (reportUri) {
    directives['report-uri'] = [reportUri];
  }
  
  // Override with custom directives
  Object.entries(customDirectives).forEach(([key, value]) => {
    directives[key] = value;
  });
  
  // Convert directives to string
  const policyString = directivesToString(directives);
  
  // Determine header name based on mode
  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
  
  debug('CSP middleware initialized with %s mode', reportOnly ? 'report-only' : 'enforce');
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Set CSP header
      res.setHeader(headerName, policyString);
      
      debug('CSP header set for %s %s', req.method, req.path);
      next();
    } catch (error) {
      debug('Error setting CSP header: %s', error.message);
      next(error);
    }
  };
}