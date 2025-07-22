import { NextResponse } from 'next/server';
import { performanceMetrics } from '../../../core/monitoring/performance-metrics.js';

/**
 * GET /api/monitor/performance
 * Returns comprehensive performance metrics
 */
export async function GET(request: globalThis.Request) {
  try {
    // Get URL parameters
    const url = new globalThis.URL(request.url);
    const timeRange = parseInt(url.searchParams.get('timeRange') || '3600000', 10); // Default to 1 hour
    
    // Get performance report
    const report = performanceMetrics.getPerformanceReport() as Record<string, unknown>;
    
    // Get endpoint performance for the specified time range
    performanceMetrics.getEndpointPerformance(timeRange);
    
    return NextResponse.json({
      ...report,
      config: {
        timeRange
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/performance/alerts/:id/acknowledge
 * Acknowledge an alert
 */
export async function POST(request: globalThis.Request) {
  try {
    const url = new globalThis.URL(request.url);
    const path = url.pathname;
    
    // Handle alert acknowledgement
    if (path.includes('/alerts/') && path.includes('/acknowledge')) {
      const alertId = path.split('/alerts/')[1].split('/acknowledge')[0];
      const success = performanceMetrics.acknowledgeAlert(alertId);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }
    }
    
    // Handle alert resolution
    if (path.includes('/alerts/') && path.includes('/resolve')) {
      const alertId = path.split('/alerts/')[1].split('/resolve')[0];
      const success = performanceMetrics.resolveAlert(alertId);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing performance request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}