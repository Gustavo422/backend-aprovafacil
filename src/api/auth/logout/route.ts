import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAuthService } from '../../../auth/enhanced-auth.service.js';
import { createClient } from '@supabase/supabase-js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service';
import { withRateLimit, createRateLimiter } from '../../../middleware/rate-limiter';

// Create a more lenient rate limiter for logout
const logoutRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20 // 20 requests per window
);

/**
 * POST /api/auth/logout - User logout endpoint
 * 
 * This endpoint handles user logout by invalidating the user's session
 * and clearing authentication cookies.
 * 
 * Rate limiting is applied but with a more lenient limit than login:
 * - 20 attempts per 15 minutes per IP address
 */
async function handler(request: NextRequest) {
  const logger = getEnhancedLogger('auth-logout');
  
  try {
    logger.debug('Iniciando processo de logout');
    
    // Extract token from Authorization header or cookies
    let token: string | undefined;
    let userId: string | undefined;
    
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, try to get from cookies
    if (!token) {
      const cookieToken = request.cookies.get('accessToken')?.value;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    // If no token found, still proceed but log warning
    if (!token) {
      logger.warn('Token não fornecido para logout');
    } else {
      // Initialize dependencies
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const authService = new EnhancedAuthService(supabase as ReturnType<typeof createClient>, {
        jwtSecret: process.env.JWT_SECRET!,
        accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '3600', 10),
        refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '2592000', 10)
      });
      
      try {
        // Try to validate token to get user ID
        const tokenData = await authService.validateAccessToken(token);
        if (tokenData.valid && tokenData.user) {
          userId = tokenData.user.id;
        }
        
        // Invalidate the session
        await authService.logout(userId, token);
        logger.info('Sessão invalidada com sucesso', { userId });
      } catch (error) {
        // If token validation fails, just log and continue with logout
        logger.warn('Falha ao validar token durante logout', { error: error.message });
      }
    }
    
    // Create response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
    
    // Clear authentication cookies
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    
    return response;
  } catch (error) {
    logger.error('Erro no processo de logout', { error: error.message });
    
    // Return success even if there was an error to ensure client side logout
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
    
    // Clear authentication cookies
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    
    return response;
  }
}

// Apply rate limiting to the logout endpoint
export const POST = withRateLimit(handler, logoutRateLimiter);