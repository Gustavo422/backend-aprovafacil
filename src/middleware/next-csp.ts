import { NextRequest, NextResponse } from 'next/server';

/**
 * Content Security Policy options for Next.js middleware
 */
export interface NextCSPOptions {
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
 * Default CSP directives for Next.js applications
 */
const defaultNextDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    // Allow Next.js scripts
    'https://cdn.vercel.com',
    'https://*.vercel.app'
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': [
    "'self'",
    // Allow Next.js API routes and server components
    'https://*.vercel.app'
  ],
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
 * Next.js middleware to set Content Security Policy headers
 * @param options CSP options
 */
export function nextContentSecurityPolicy(options: NextCSPOptions = {}) {
  const {
    reportOnly = false,
    reportUri,
    directives: customDirectives = {}
  } = options;
  
  // Merge default and custom directives
  const directives = { ...defaultNextDirectives };
  
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
  
  return (_request: NextRequest) => {
    // Create response with CSP header
    const response = NextResponse.next();
    
    // Set CSP header
    response.headers.set(headerName, policyString);
    
    // Set other security headers
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
    );
    
    return response;
  };
}