import { performanceMetrics } from '../core/monitoring/performance-metrics.js';
import express from 'express';

/**
 * Initialize performance monitoring middleware
 * This function should be called in the app.ts file to integrate performance monitoring
 */
export function initializePerformanceMonitoring(app: express.Application): void {
  // Add performance monitoring middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Function to finalize metric collection
    const finishCollection = () => {
      const responseTime = Date.now() - start;
      
      // Add metric to collector (non-blocking)
      Promise.resolve().then(() => {
        try {
          // In a real implementation, we would add this to the metrics store
          console.log(`[Performance] ${req.method} ${req.path} - ${responseTime}ms`);
        } catch (error) {
          console.error('Error storing performance metric:', error);
        }
      });
    };

    // Capture response finish event
    res.on('finish', finishCollection);
    res.on('close', finishCollection);

    next();
  });

  // Start collecting system metrics
  performanceMetrics.startCollection(60000); // Collect every minute

  // Register API routes for performance monitoring
  app.use('/api/monitor/performance', (req, res, next) => {
    import('../api/monitor/performance/route.js')
      .then(module => {
        if (req.method === 'GET') {
          module.GET(req as unknown as globalThis.Request).then((response: unknown) => {
            let status = 200;
            let body = response;
            if (typeof response === 'object' && response !== null) {
              if ('status' in response && typeof (response as { status: number }).status === 'number') {
                status = (response as { status: number }).status;
              }
              if ('json' in response && typeof (response as { json: () => unknown }).json === 'function') {
                body = (response as { json: () => unknown }).json();
              }
            }
            res.status(status).json(body);
          }).catch(next);
        } else if (req.method === 'POST') {
          module.POST(req as unknown as globalThis.Request).then((response: unknown) => {
            let status = 200;
            let body = response;
            if (typeof response === 'object' && response !== null) {
              if ('status' in response && typeof (response as { status: number }).status === 'number') {
                status = (response as { status: number }).status;
              }
              if ('json' in response && typeof (response as { json: () => unknown }).json === 'function') {
                body = (response as { json: () => unknown }).json();
              }
            }
            res.status(status).json(body);
          }).catch(next);
        } else {
          res.status(405).json({ error: 'Method not allowed' });
        }
      })
      .catch(next);
  });

  // Register API routes for alerts
  app.use('/api/monitor/alerts', (req, res, next) => {
    import('../api/monitor/alerts/route.js')
      .then(module => {
        if (req.method === 'GET') {
          module.GET(req as unknown as globalThis.Request).then((response: unknown) => {
            let status = 200;
            let body = response;
            if (typeof response === 'object' && response !== null) {
              if ('status' in response && typeof (response as { status: number }).status === 'number') {
                status = (response as { status: number }).status;
              }
              if ('json' in response && typeof (response as { json: () => unknown }).json === 'function') {
                body = (response as { json: () => unknown }).json();
              }
            }
            res.status(status).json(body);
          }).catch(next);
        } else if (req.method === 'POST') {
          module.POST(req as unknown as globalThis.Request).then((response: unknown) => {
            let status = 200;
            let body = response;
            if (typeof response === 'object' && response !== null) {
              if ('status' in response && typeof (response as { status: number }).status === 'number') {
                status = (response as { status: number }).status;
              }
              if ('json' in response && typeof (response as { json: () => unknown }).json === 'function') {
                body = (response as { json: () => unknown }).json();
              }
            }
            res.status(status).json(body);
          }).catch(next);
        } else {
          res.status(405).json({ error: 'Method not allowed' });
        }
      })
      .catch(next);
  });

  console.log('Performance monitoring initialized');
}