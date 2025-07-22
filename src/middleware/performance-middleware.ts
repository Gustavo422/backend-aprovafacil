import { NextResponse, NextRequest } from 'next/server';
// import { performanceMetrics } from '../core/monitoring/performance-metrics.js';

/**
 * Middleware to track performance metrics for all API requests
 */
export async function performanceMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
) {
  const start = Date.now();
  
  try {
    // Continue to the next middleware or route handler
    const response = await next();
    
    // Calculate performance metrics
    const responseTime = Date.now() - start;
    
    // Add metrics to the collector
    // Remover a linha:   28:11  error  '_metric' is assigned a value but never used
    
    // Store the metric (non-blocking)
    Promise.resolve().then(() => {
      try {
        // In a real implementation, we would add this to the metrics store
        // For now, we'll just log it
        console.log(`[Performance] ${request.method} ${request.nextUrl.pathname} - ${responseTime}ms`);
      } catch (error) {
        console.error('Error storing performance metric:', error);
      }
    });
    
    return response;
  } catch (error) {
    // If an error occurred, still try to record the metric
    const responseTime = Date.now() - start;
    
    // Log the error (non-blocking)
    Promise.resolve().then(() => {
      console.error(`[Performance Error] ${request.method} ${request.nextUrl.pathname} - ${responseTime}ms:`, error);
    });
    
    // Re-throw the error to be handled by the error middleware
    throw error;
  }
}