/**
 * Security middleware module
 * 
 * This module exports various security middlewares to protect the application
 * against common web vulnerabilities.
 */

import { Express } from 'express';
import { Request, Response, NextFunction } from 'express';
import { contentSecurityPolicy, CSPOptions } from './csp.js';
import helmet from 'helmet';

/**
 * Apply all security middlewares
 * @param options Options for security middlewares
 */
export function applySecurityMiddlewares(app: Express, options: { csp?: CSPOptions } = {}): void {
  // Apply Helmet middleware for basic security headers
  app.use(helmet());
  
  // Apply Content Security Policy
  app.use(contentSecurityPolicy(options.csp));
  
  // Add XSS protection header
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  
  // Add X-Content-Type-Options header
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  
  // Add X-Frame-Options header
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  
  // Add Referrer-Policy header
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  // Add Permissions-Policy header
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
    );
    next();
  });
}

// Export individual middlewares
export { contentSecurityPolicy } from './csp.js';