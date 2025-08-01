import { Request, Response } from 'express';
import { alertNotifier } from '../../../core/monitoring/alert-notifier.js';
import { performanceMetrics } from '../../../core/monitoring/performance-metrics.js';
import { logger } from '../../../lib/logger.js';

/**
 * GET /api/monitor/alerts
 * Returns all active alerts
 */
export const GET = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'active';
    let alerts;
    if (status === 'all') {
      alerts = performanceMetrics.getAllAlerts();
    } else if (status === 'active') {
      alerts = performanceMetrics.getActiveAlerts();
    } else {
      alerts = performanceMetrics.getAllAlerts().filter(a => a.status === status);
    }
    const inAppAlerts = alertNotifier.getInAppAlerts();
    return res.json({
      alerts,
      inAppAlerts,
      notificationChannels: alertNotifier.getAllChannelConfigs(),
    });
  } catch (error) {
    logger.error('Erro ao buscar alertas:', error);
    return res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
};

/**
 * POST /api/monitor/alerts/config
 * Configure alert notification channels
 */
export const POST = async (req: Request, res: Response) => {
  try {
    const path = req.path;
    // Handle alert notification configuration
    if (path.endsWith('/config')) {
      const { channel, config } = req.body;
      if (!channel || !config) {
        return res.status(400).json({ error: 'Missing channel or configuration' });
      }
      alertNotifier.configureChannel(channel, config);
      return res.json({
        success: true,
        config: alertNotifier.getChannelConfig(channel),
      });
    }
    // Handle alert acknowledgement
    if (path.includes('/acknowledge/')) {
      const alertId = path.split('/acknowledge/')[1];
      const success = performanceMetrics.acknowledgeAlert(alertId);
      if (success) {
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: 'Alert not found' });
      }
    }
    // Handle alert resolution
    if (path.includes('/resolve/')) {
      const alertId = path.split('/resolve/')[1];
      const success = performanceMetrics.resolveAlert(alertId);
      if (success) {
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: 'Alert not found' });
      }
    }
    // Handle clearing in-app notifications
    if (path.endsWith('/clear-in-app')) {
      alertNotifier.clearInAppAlerts();
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Invalid endpoint' });
  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/monitor/alerts:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};