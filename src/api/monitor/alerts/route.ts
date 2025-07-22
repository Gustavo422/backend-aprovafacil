import { NextResponse } from 'next/server';
import { alertNotifier } from '../../../core/monitoring/alert-notifier.js';
import { performanceMetrics } from '../../../core/monitoring/performance-metrics.js';

/**
 * GET /api/monitor/alerts
 * Returns all active alerts
 */
export async function GET(request: globalThis.Request) {
  try {
    // Get URL parameters
    const url = new globalThis.URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    
    let alerts;
    
    if (status === 'all') {
      alerts = performanceMetrics.getAllAlerts();
    } else if (status === 'active') {
      alerts = performanceMetrics.getActiveAlerts();
    } else {
      alerts = performanceMetrics.getAllAlerts().filter(a => a.status === status);
    }
    
    // Get in-app notifications
    const inAppAlerts = alertNotifier.getInAppAlerts();
    
    return NextResponse.json({
      alerts,
      inAppAlerts,
      notificationChannels: alertNotifier.getAllChannelConfigs()
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/alerts/config
 * Configure alert notification channels
 */
export async function POST(request: globalThis.Request) {
  try {
    const url = new globalThis.URL(request.url);
    const path = url.pathname;
    
    // Handle alert notification configuration
    if (path.endsWith('/config')) {
      const body = await request.json();
      const { channel, config } = body;
      
      if (!channel || !config) {
        return NextResponse.json(
          { error: 'Missing channel or configuration' },
          { status: 400 }
        );
      }
      
      alertNotifier.configureChannel(channel, config);
      
      return NextResponse.json({
        success: true,
        config: alertNotifier.getChannelConfig(channel)
      });
    }
    
    // Handle alert acknowledgement
    if (path.includes('/acknowledge/')) {
      const alertId = path.split('/acknowledge/')[1];
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
    if (path.includes('/resolve/')) {
      const alertId = path.split('/resolve/')[1];
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
    
    // Handle clearing in-app notifications
    if (path.endsWith('/clear-in-app')) {
      alertNotifier.clearInAppAlerts();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing alert request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}