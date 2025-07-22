import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Monitoring service for system health checks and metrics
 */
export class MonitoringService {
  private client: SupabaseClient;
  
  /**
   * Constructor
   * @param client Supabase client
   */
  constructor(client: SupabaseClient) {
    this.client = client;
  }
  
  /**
   * Record a health check
   * @param checkName Name of the check
   * @param status Status of the check
   * @param details Additional details
   * @param durationMs Duration in milliseconds
   * @returns Health check ID
   */
  async recordHealthCheck(
    checkName: string,
    status: 'healthy' | 'unhealthy' | 'warning',
    details?: Record<string, unknown>,
    durationMs?: number
  ): Promise<string> {
    try {
      const { data, error } = await this.client.rpc('record_health_check', {
        p_check_name: checkName,
        p_status: status,
        p_details: details || null,
        p_duration_ms: durationMs || null
      });
      
      if (error) {
        throw new Error(`Failed to record health check: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error recording health check:', error);
      
      // Fallback to direct insert if RPC fails
      const checkId = uuidv4();
      
      const { error: insertError } = await this.client
        .from('health_checks')
        .insert({
          id: checkId,
          check_name: checkName,
          status,
          details: details || null,
          duration_ms: durationMs || null
        });
      
      if (insertError) {
        throw new Error(`Failed to record health check: ${insertError.message}`);
      }
      
      return checkId;
    }
  }
  
  /**
   * Record a system metric
   * @param metricName Name of the metric
   * @param metricValue Value of the metric
   * @param details Additional details
   * @returns Metric ID
   */
  async recordSystemMetric(
    metricName: string,
    metricValue: number,
    details?: Record<string, unknown>
  ): Promise<string> {
    try {
      const { data, error } = await this.client.rpc('record_system_metric', {
        p_metric_name: metricName,
        p_metric_value: metricValue,
        p_details: details || null
      });
      
      if (error) {
        throw new Error(`Failed to record system metric: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error recording system metric:', error);
      
      // Fallback to direct insert if RPC fails
      const metricId = uuidv4();
      
      const { error: insertError } = await this.client
        .from('system_metrics')
        .insert({
          id: metricId,
          metric_name: metricName,
          metric_value: metricValue,
          details: details || null
        });
      
      if (insertError) {
        throw new Error(`Failed to record system metric: ${insertError.message}`);
      }
      
      return metricId;
    }
  }
  
  /**
   * Get latest health checks
   * @returns Latest health checks
   */
  async getLatestHealthChecks() {
    try {
      const { data, error } = await this.client.rpc('get_latest_health_checks');
      
      if (error) {
        throw new Error(`Failed to get latest health checks: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error getting latest health checks:', error);
      
      // Fallback to direct query if RPC fails
      const { data, error: queryError } = await this.client
        .from('health_checks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (queryError) {
        throw new Error(`Failed to get health checks: ${queryError.message}`);
      }
      
      // Process the data manually to get latest checks
      const latestChecks = new Map<string, {
        id: string;
        check_name: string;
        status: string;
        details: Record<string, unknown> | null;
        duration_ms: number | null;
        created_at: string;
      }>();
      
      data?.forEach(check => {
        if (!latestChecks.has(check.check_name) || 
            new Date(check.created_at) > new Date(latestChecks.get(check.check_name)!.created_at)) {
          latestChecks.set(check.check_name, check);
        }
      });
      
      return Array.from(latestChecks.values());
    }
  }
  
  /**
   * Get system metrics over time
   * @param metricName Name of the metric
   * @param startDate Start date
   * @param endDate End date
   * @param interval Time interval
   * @returns System metrics over time
   */
  async getSystemMetricsOverTime(
    metricName: string,
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: Date = new Date(),
    interval: string = '1 hour'
  ) {
    try {
      const { data, error } = await this.client.rpc('get_system_metrics_over_time', {
        p_metric_name: metricName,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: interval
      });
      
      if (error) {
        throw new Error(`Failed to get system metrics: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error getting system metrics:', error);
      
      // Fallback to direct query if RPC fails
      const { data, error: queryError } = await this.client
        .from('system_metrics')
        .select('*')
        .eq('metric_name', metricName)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (queryError) {
        throw new Error(`Failed to get system metrics: ${queryError.message}`);
      }
      
      // Process the data manually to group by interval
      const metrics: Record<string, {
        time_bucket: string;
        values: number[];
      }> = {};
      
      data?.forEach(metric => {
        const date = new Date(metric.created_at);
        let timeBucket: string;
        
        // Simple interval parsing
        switch (interval) {
          case '1 hour':
            date.setMinutes(0, 0, 0);
            timeBucket = date.toISOString();
            break;
          case '1 day':
            date.setHours(0, 0, 0, 0);
            timeBucket = date.toISOString();
            break;
          default:
            timeBucket = date.toISOString();
        }
        
        if (!metrics[timeBucket]) {
          metrics[timeBucket] = {
            time_bucket: timeBucket,
            values: []
          };
        }
        
        metrics[timeBucket].values.push(metric.metric_value);
      });
      
      return Object.values(metrics).map(metric => ({
        time_bucket: metric.time_bucket,
        avg_value: metric.values.reduce((sum, val) => sum + val, 0) / metric.values.length,
        min_value: Math.min(...metric.values),
        max_value: Math.max(...metric.values)
      }));
    }
  }
  
  /**
   * Perform database health check
   * @returns Health check results
   */
  async performDatabaseHealthCheck() {
    try {
      const { data, error } = await this.client.rpc('perform_database_health_check');
      
      if (error) {
        throw new Error(`Failed to perform database health check: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error performing database health check:', error);
      throw error;
    }
  }
  
  /**
   * Clean old monitoring data
   * @param daysToKeep Days to keep data
   * @returns Number of deleted records
   */
  async cleanOldMonitoringData(daysToKeep = 30): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('clean_old_monitoring_data', {
        p_days_to_keep: daysToKeep
      });
      
      if (error) {
        throw new Error(`Failed to clean old monitoring data: ${error.message}`);
      }
      
      return data as number;
    } catch (error) {
      console.error('Error cleaning old monitoring data:', error);
      
      // Fallback to direct delete if RPC fails
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const { error: healthDeleteError, count: healthCount } = await this.client
        .from('health_checks')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
      
      if (healthDeleteError) {
        throw new Error(`Failed to clean old health checks: ${healthDeleteError.message}`);
      }
      
      const { error: metricsDeleteError, count: metricsCount } = await this.client
        .from('system_metrics')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
      
      if (metricsDeleteError) {
        throw new Error(`Failed to clean old system metrics: ${metricsDeleteError.message}`);
      }
      
      return (healthCount || 0) + (metricsCount || 0);
    }
  }
}