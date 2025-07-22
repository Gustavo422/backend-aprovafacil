import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createDebugger } from '../utils/debugger.js';

// Create a debugger specific for the CSRF middleware
const debug = createDebugger('middleware:csrf');

// CSRF token secret
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret';

// CSRF token expiration time (1 hour by default)
const CSRF_TOKEN_EXPIRY = parseInt(process.env.CSRF_TOKEN_EXPIRY || '3600', 10);

/**
 * Generate a CSRF token
 * @param userId User ID to bind to the token
 * @returns CSRF token
 */
export function generateCsrfToken(userId: string): string {
  // Create a timestamp for token expiration
  const expires = Date.now() + CSRF_TOKEN_EXPIRY * 1000;
  
  // Create a random token
  const randomToken = crypto.randomBytes(32).toString('hex');
  
  // Create a hash of the user ID, expiration time, and random token
  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(`${userId}:${expires}:${randomToken}`);
  const hash = hmac.digest('hex');
  
  // Return the token in the format: expires:randomToken:hash
  return `${expires}:${randomToken}:${hash}`;
}

/**
 * Validate a CSRF token
 * @param token CSRF token
 * @param userId User ID to validate against
 * @returns True if token is valid
 */
export function validateCsrfToken(token: string, userId: string): boolean {
  try {
    // Split the token into its components
    const [expiresStr, randomToken, hash] = token.split(':');
    
    // Check if all components exist
    if (!expiresStr || !randomToken || !hash) {
      debug('Invalid token format');
      return false;
    }
    
    // Parse expiration time
    const expires = parseInt(expiresStr, 10);
    
    // Check if token has expired
    if (Date.now() > expires) {
      debug('Token expired');
      return false;
    }
    
    // Recreate the hash for verification
    const hmac = crypto.createHmac('sha256', CSRF_SECRET);
    hmac.update(`${userId}:${expires}:${randomToken}`);
    const expectedHash = hmac.digest('hex');
    
    // Compare the hashes
    if (hash !== expectedHash) {
      debug('Invalid token hash');
      return false;
    }
    
    return true;
  } catch (error) {
    debug('Error validating CSRF token: %s', error.message);
    return false;
  }
}

/**
 * Middleware to generate and set CSRF token
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      debug('User not authenticated, skipping CSRF token generation');
      return next();
    }
    
    // Generate CSRF token
    const csrfToken = generateCsrfToken(req.user.id);
    
    // Set CSRF token in response header
    res.setHeader('X-CSRF-Token', csrfToken);
    
    // Store token in response locals for use in templates
    res.locals.csrfToken = csrfToken;
    
    debug('CSRF token generated and set for user: %s', req.user.id);
    next();
  } catch (error) {
    debug('Error setting CSRF token: %s', error.message);
    next(error);
  }
}

/**
 * Middleware to validate CSRF token
 */
export function validateCsrf(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      debug('Skipping CSRF validation for %s request', req.method);
      return next();
    }
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      debug('User not authenticated, cannot validate CSRF token');
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Get CSRF token from request header or body
    const csrfToken = req.headers['x-csrf-token'] || 
                      req.body._csrf || 
                      req.query._csrf as string;
    
    // Check if token exists
    if (!csrfToken) {
      debug('CSRF token missing');
      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      });
    }
    
    // Validate token
    const isValid = validateCsrfToken(csrfToken as string, req.user.id);
    
    if (!isValid) {
      debug('Invalid CSRF token');
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
    
    debug('CSRF token validated successfully for user: %s', req.user.id);
    next();
  } catch (error) {
    debug('Error validating CSRF token: %s', error.message);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}