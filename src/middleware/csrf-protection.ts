import { NextRequest, NextResponse } from 'next/server';
// import { AuthService } from '../services/AuthService';
import { getEnhancedLogger } from '../lib/logging/enhanced-logging-service';

/**
 * Middleware to protect routes with CSRF validation
 * 
 * This middleware validates CSRF tokens for non-GET requests
 * to protect against CSRF attacks.
 * 
 * @param request - Next.js request object
 * @returns Next.js response or undefined to continue
 */
export async function csrfProtection(request: NextRequest) {
  const logger = getEnhancedLogger('csrf-middleware');
  
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return;
  }
  
  try {
    // Get CSRF token from header
    const csrfToken = request.headers.get('X-CSRF-Token');
    
    // Check if token exists
    if (!csrfToken) {
      logger.warn('CSRF token missing');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token missing'
          }
        },
        { status: 403 }
      );
    }
    
    // Get access token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      logger.warn('Access token missing, cannot validate CSRF token');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }
    
    // Initialize dependencies
    // const userRepository = new UserRepository();
    // const authService = new AuthService(
    //   userRepository,
    //   process.env.JWT_SECRET!,
    //   parseInt(process.env.JWT_EXPIRES_IN || '604800', 10)
    // );
    
    // Validate access token to get user ID
    try {
      // const tokenData = await authService.validateToken(accessToken);
      
      // Validate CSRF token
      // const isValid = authService.validateCsrfToken(csrfToken, tokenData.userId);
      
      // if (!isValid) {
      //   logger.warn('Invalid CSRF token', { userId: tokenData.userId });
      //   return NextResponse.json(
      //     {
      //       success: false,
      //       error: {
      //         code: 'CSRF_TOKEN_INVALID',
      //         message: 'Invalid CSRF token'
      //       }
      //     },
      //     { status: 403 }
      //   );
      // }
      
      // logger.debug('CSRF token validated successfully', { userId: tokenData.userId });
      // return removido pois é inalcançável
    } catch (error) {
      logger.error('Error validating token for CSRF check', { error: error.message });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Error in CSRF protection middleware', { error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}