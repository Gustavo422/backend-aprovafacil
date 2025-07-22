import { Request, Response } from 'express';
import { metricsStore } from './metrics-store.js';
import { getSystemMetrics } from './system-metrics.js';
import { getDatabaseStatus } from './database-status.js';
import { getLogStatus } from './log-status.js';

// Performance thresholds
const THRESHOLDS = {
  CPU_WARNING: 70, // 70% CPU usage
  CPU_CRITICAL: 85, // 85% CPU usage
  MEMORY_WARNING: 75, // 75% memory usage
  MEMORY_CRITICAL: 90, // 90% memory usage
  RESPONSE_TIME_WARNING: 500, // 500ms
  RESPONSE_TIME_CRITICAL: 1000, // 1s
  ERROR_RATE_WARNING: 0.05, // 5% error rate
  ERROR_RATE_CRITICAL: 0.10, // 10% error rate
  DB_RESPONSE_WARNING: 200, // 200ms
  DB_RESPONSE_CRITICAL: 500, // 500ms
};

// Types for performance metrics
export interface PerformanceMetric {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface EndpointPerformance {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
  p95ResponseTime: number; // 95th percentile
  errorRate: number;
}

export interface SystemPerformance {
  cpuUsage: number;
  memoryUsage: number;
  loadAverage: number[];
  activeConnections: number;
  uptime: number;
}

export interface DatabasePerformance {
  avgResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  connectionPoolUsage: number;
  activeQueries: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'warning' | 'critical';
  category: 'system' | 'database' | 'endpoint' | 'error';
  message: string;
  value: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
}

// Definição explícita para NodeJS.Timeout
type NodeJSTimeout = ReturnType<typeof setTimeout>;

class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private alertId = 0;
  private collectionInterval: NodeJSTimeout | null = null;
  private isCollecting = false;

  constructor() {
    // Start automatic collection
    this.startCollection();
  }

  /**
   * Start collecting metrics at regular intervals
   */
  startCollection(intervalMs = 60000): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, intervalMs);
    
    console.log(`Performance metrics collection started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.isCollecting = false;
      console.log('Performance metrics collection stopped');
    }
  }

  /**
   * Middleware to collect request performance metrics
   */
  middleware() {
    return (req: Request, res: Response, next: (...args: unknown[]) => unknown) => {
      const start = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      const startCpu = process.cpuUsage();

      // Function to finalize metric collection
      const finishCollection = () => {
        const responseTime = Date.now() - start;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // MB
        
        const endCpu = process.cpuUsage(startCpu);
        const cpuUsage = (endCpu.user + endCpu.system) / 1000; // ms of CPU time

        const metric: PerformanceMetric = {
          timestamp: Date.now(),
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          memoryUsage,
          cpuUsage
        };

        this.metrics.push(metric);
        this.checkForAlerts(metric);

        // Keep only the last 10000 metrics
        if (this.metrics.length > 10000) {
          this.metrics = this.metrics.slice(-10000);
        }
      };

      // Capture response finish event
      res.on('finish', finishCollection);
      res.on('close', finishCollection);

      next();
    };
  }

  /**
   * Collect system-wide metrics
   */
  async collectSystemMetrics(): Promise<void> {
    try {
      const [systemMetrics, dbStatus, logStatus] = await Promise.all([
        getSystemMetrics(),
        getDatabaseStatus(),
        getLogStatus()
      ]);

      // Add metrics to the store
      metricsStore.addSystemMetric(
        systemMetrics.cpu.usage, 
        systemMetrics.memory.usage
      );
      
      metricsStore.addDatabaseMetric(
        dbStatus.responseTime
      );
      
      metricsStore.addLogsMetric(
        logStatus.logStats.info,
        logStatus.logStats.warnings,
        logStatus.logStats.errors
      );

      // Check for system alerts
      this.checkForSystemAlerts(systemMetrics, dbStatus);
      
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Check for alerts based on request metrics
   */
  private checkForAlerts(metric: PerformanceMetric): void {
    // Check for slow response time
    if (metric.responseTime > THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      this.createAlert({
        type: 'critical',
        category: 'endpoint',
        message: `Critical response time for ${metric.method} ${metric.endpoint}`,
        value: metric.responseTime,
        threshold: THRESHOLDS.RESPONSE_TIME_CRITICAL
      });
    } else if (metric.responseTime > THRESHOLDS.RESPONSE_TIME_WARNING) {
      this.createAlert({
        type: 'warning',
        category: 'endpoint',
        message: `Slow response time for ${metric.method} ${metric.endpoint}`,
        value: metric.responseTime,
        threshold: THRESHOLDS.RESPONSE_TIME_WARNING
      });
    }

    // Check for error status codes
    if (metric.statusCode >= 500) {
      this.createAlert({
        type: 'critical',
        category: 'error',
        message: `Server error ${metric.statusCode} on ${metric.method} ${metric.endpoint}`,
        value: metric.statusCode,
        threshold: 500
      });
    } else if (metric.statusCode >= 400) {
      this.createAlert({
        type: 'warning',
        category: 'error',
        message: `Client error ${metric.statusCode} on ${metric.method} ${metric.endpoint}`,
        value: metric.statusCode,
        threshold: 400
      });
    }

    // Check for high memory usage per request
    if (metric.memoryUsage > 50) { // 50MB per request is high
      this.createAlert({
        type: 'warning',
        category: 'system',
        message: `High memory usage (${metric.memoryUsage.toFixed(2)}MB) for ${metric.method} ${metric.endpoint}`,
        value: metric.memoryUsage,
        threshold: 50
      });
    }
  }

  /**
   * Check for system-wide alerts
   */
  private checkForSystemAlerts(systemMetrics: unknown, dbStatus: unknown): void {
    const metrics = systemMetrics as { cpu?: { usage: number }; memory?: { usage: number } };
    const db = dbStatus as { responseTime?: number };
    // CPU alerts
    if (metrics.cpu && typeof metrics.cpu.usage === 'number') {
      if (metrics.cpu.usage > THRESHOLDS.CPU_CRITICAL) {
        this.createAlert({
          type: 'critical',
          category: 'system',
          message: `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
          value: metrics.cpu.usage,
          threshold: THRESHOLDS.CPU_CRITICAL
        });
      } else if (metrics.cpu.usage > THRESHOLDS.CPU_WARNING) {
        this.createAlert({
          type: 'warning',
          category: 'system',
          message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
          value: metrics.cpu.usage,
          threshold: THRESHOLDS.CPU_WARNING
        });
      }
    }
    // Memory alerts
    if (metrics.memory && typeof metrics.memory.usage === 'number') {
      if (metrics.memory.usage > THRESHOLDS.MEMORY_CRITICAL) {
        this.createAlert({
          type: 'critical',
          category: 'system',
          message: `Critical memory usage: ${metrics.memory.usage.toFixed(1)}%`,
          value: metrics.memory.usage,
          threshold: THRESHOLDS.MEMORY_CRITICAL
        });
      } else if (metrics.memory.usage > THRESHOLDS.MEMORY_WARNING) {
        this.createAlert({
          type: 'warning',
          category: 'system',
          message: `High memory usage: ${metrics.memory.usage.toFixed(1)}%`,
          value: metrics.memory.usage,
          threshold: THRESHOLDS.MEMORY_WARNING
        });
      }
    }

    // DB response time alerts
    if (db && typeof db.responseTime === 'number') {
      if (db.responseTime > THRESHOLDS.DB_RESPONSE_CRITICAL) {
        this.createAlert({
          type: 'critical',
          category: 'database',
          message: `Critical DB response time: ${db.responseTime.toFixed(1)}ms`,
          value: db.responseTime,
          threshold: THRESHOLDS.DB_RESPONSE_CRITICAL
        });
      } else if (db.responseTime > THRESHOLDS.DB_RESPONSE_WARNING) {
        this.createAlert({
          type: 'warning',
          category: 'database',
          message: `High DB response time: ${db.responseTime.toFixed(1)}ms`,
          value: db.responseTime,
          threshold: THRESHOLDS.DB_RESPONSE_WARNING
        });
      }
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'status'>): void {
    const id = `alert-${++this.alertId}`;
    const timestamp = Date.now();
    
    const newAlert: PerformanceAlert = {
      ...alert,
      id,
      timestamp,
      status: 'active'
    };
    
    // Check if a similar alert already exists
    const similarAlertIndex = this.alerts.findIndex(a => 
      a.category === alert.category && 
      a.type === alert.type && 
      a.message === alert.message &&
      a.status === 'active'
    );
    
    if (similarAlertIndex >= 0) {
      // Update existing alert
      this.alerts[similarAlertIndex] = newAlert;
    } else {
      // Add new alert
      this.alerts.push(newAlert);
      
      // Log the alert
      console.log(`[${alert.type.toUpperCase()}] ${alert.message}`);
    }
    
    // Keep only the last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex >= 0) {
      this.alerts[alertIndex].status = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex >= 0) {
      this.alerts[alertIndex].status = 'resolved';
      return true;
    }
    return false;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => a.status === 'active');
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get endpoint performance metrics
   */
  getEndpointPerformance(timeRangeMs = 3600000): EndpointPerformance[] {
    const now = Date.now();
    const cutoff = now - timeRangeMs;
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    // Group by endpoint
    const endpointMap = new Map<string, PerformanceMetric[]>();
    
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const metrics = endpointMap.get(key) || [];
      metrics.push(metric);
      endpointMap.set(key, metrics);
    });
    
    // Calculate statistics for each endpoint
    return Array.from(endpointMap.entries()).map(([key, metrics]) => {
      const [method, endpoint] = key.split(' ');
      const count = metrics.length;
      
      // Calculate average response time
      const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0);
      const avgResponseTime = count > 0 ? totalResponseTime / count : 0;
      
      // Calculate 95th percentile response time
      const sortedResponseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
      const p95ResponseTime = sortedResponseTimes[p95Index] || avgResponseTime;
      
      // Calculate error rate
      const errorCount = metrics.filter(m => m.statusCode >= 400).length;
      const errorRate = count > 0 ? errorCount / count : 0;
      
      return {
        endpoint,
        method,
        count,
        avgResponseTime,
        p95ResponseTime,
        errorRate
      };
    }).sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  }

  /**
   * Get system performance metrics
   */
  getSystemPerformance(): SystemPerformance {
    const systemHistory = metricsStore.getSystemHistory(1); // Last hour
    
    if (systemHistory.length === 0) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        loadAverage: [0, 0, 0],
        activeConnections: 0,
        uptime: process.uptime()
      };
    }
    
    // Calculate averages
    const cpuUsage = systemHistory.reduce((sum, p) => sum + p.cpu, 0) / systemHistory.length;
    const memoryUsage = systemHistory.reduce((sum, p) => sum + p.memory, 0) / systemHistory.length;
    
    return {
      cpuUsage,
      memoryUsage,
      loadAverage: typeof (process as unknown as { loadavg?: () => number[] }).loadavg === 'function'
        ? (process as unknown as { loadavg: () => number[] }).loadavg()
        : [0, 0, 0], // Compatível com Windows
      activeConnections: this.getActiveConnections(),
      uptime: process.uptime()
    };
  }

  /**
   * Get database performance metrics
   */
  getDatabasePerformance(): DatabasePerformance {
    const dbHistory = metricsStore.getDatabaseHistory(1); // Last hour
    
    if (dbHistory.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0,
        connectionPoolUsage: 0,
        activeQueries: 0
      };
    }
    
    // Calculate averages
    const avgResponseTime = dbHistory.reduce((sum, p) => sum + p.dbResponseTime, 0) / dbHistory.length;
    const maxResponseTime = Math.max(...dbHistory.map(p => p.dbResponseTime));
    
    return {
      avgResponseTime,
      maxResponseTime,
      errorRate: 0, // Would need to be tracked separately
      connectionPoolUsage: 0, // Would need to be tracked separately
      activeQueries: 0 // Would need to be tracked separately
    };
  }

  /**
   * Get active connections (estimate)
   */
  private getActiveConnections(): number {
    // This is a simple estimate based on recent metrics
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Count unique IPs in the last 5 minutes
    const recentMetrics = this.metrics.filter(m => m.timestamp >= fiveMinutesAgo);
    
    // In a real implementation, we would track unique users/sessions
    // For now, just return the count of recent requests as an approximation
    return Math.min(recentMetrics.length, 100); // Cap at 100 to avoid misleading numbers
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(timeRangeMs = 3600000): unknown {
    return {
      system: this.getSystemPerformance(),
      database: this.getDatabasePerformance(),
      endpoints: this.getEndpointPerformance(timeRangeMs),
      alerts: this.getActiveAlerts(),
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const performanceMetrics = new PerformanceMetricsCollector();