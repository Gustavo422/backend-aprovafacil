import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Connection log service for tracking Supabase connection events
 */
export class ConnectionLogService {
  private client: SupabaseClient;

  /**
   * Constructor
   * @param client Supabase client
   */
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Log a connection event
   * @param eventType Event type
   * @param status Status
   * @param options Additional options
   * @returns Log ID
   */
  async logEvent(
    eventType: string,
    status: 'success' | 'error',
    options: {
      userId?: string;
      errorMessage?: string;
      requestPath?: string;
      requestMethod?: string;
      responseStatus?: number;
      durationMs?: number;
      clientInfo?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    try {
      const { data, error } = await this.client.rpc('log_connection_event', {
        p_user_id: options.userId || null,
        p_event_type: eventType,
        p_status: status,
        p_error_message: options.errorMessage || null,
        p_request_path: options.requestPath || null,
        p_request_method: options.requestMethod || null,
        p_response_status: options.responseStatus || null,
        p_duration_ms: options.durationMs || null,
        p_client_info: options.clientInfo || null,
        p_metadata: options.metadata || null
      });

      if (error) {
        throw new Error(`Failed to log connection event: ${error.message}`);
      }

      return data as string;
    } catch (error) {
      console.error('Error logging connection event:', error);

      // Fallback to direct insert if RPC fails
      const logId = uuidv4();

      const { error: insertError } = await this.client
        .from('connection_logs')
        .insert({
          id: logId,
          user_id: options.userId || null,
          event_type: eventType,
          status,
          error_message: options.errorMessage || null,
          request_path: options.requestPath || null,
          request_method: options.requestMethod || null,
          response_status: options.responseStatus || null,
          duration_ms: options.durationMs || null,
          client_info: options.clientInfo || null,
          metadata: options.metadata || null
        });

      if (insertError) {
        throw new Error(`Failed to log connection event: ${insertError.message}`);
      }

      return logId;
    }
  }

  /**
   * Log a successful connection
   * @param options Connection options
   * @returns Log ID
   */
  async logSuccessfulConnection(options: {
    userId?: string;
    requestPath?: string;
    requestMethod?: string;
    responseStatus?: number;
    durationMs?: number;
    clientInfo?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {}): Promise<string> {
    return this.logEvent('connection', 'success', options);
  }

  /**
   * Log a failed connection
   * @param errorMessage Error message
   * @param options Connection options
   * @returns Log ID
   */
  async logFailedConnection(
    errorMessage: string,
    options: {
      userId?: string;
      requestPath?: string;
      requestMethod?: string;
      responseStatus?: number;
      durationMs?: number;
      clientInfo?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    return this.logEvent('connection', 'error', {
      ...options,
      errorMessage
    });
  }

  /**
   * Get connection statistics
   * @param startDate Start date
   * @param endDate End date
   * @returns Connection statistics
   */
  async getConnectionStatistics(
    startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ) {
    try {
      const { data, error } = await this.client.rpc('get_connection_statistics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (error) {
        throw new Error(`Failed to get connection statistics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting connection statistics:', error);

      // Fallback to direct query if RPC fails
      const { data, error: queryError } = await this.client.from('connection_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('event_type', 'connection');

      if (queryError) {
        throw new Error(`Failed to get connection logs: ${queryError.message}`);
      }

      // Process the data manually
      const statistics: Record<string, {
        date: string;
        total_connections: number;
        successful_connections: number;
        failed_connections: number;
        durations: number[];
      }> = {};

      data?.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];

        if (!statistics[date]) {
          statistics[date] = {
            date,
            total_connections: 0,
            successful_connections: 0,
            failed_connections: 0,
            durations: []
          };
        }

        statistics[date].total_connections++;

        if (log.status === 'success') {
          statistics[date].successful_connections++;
        } else {
          statistics[date].failed_connections++;
        }

        if (log.duration_ms) {
          statistics[date].durations.push(log.duration_ms);
        }
      });

      return Object.values(statistics).map(stat => ({
        date: stat.date,
        total_connections: stat.total_connections,
        successful_connections: stat.successful_connections,
        failed_connections: stat.failed_connections,
        avg_duration_ms: stat.durations.length > 0
          ? stat.durations.reduce((sum, duration) => sum + duration, 0) / stat.durations.length
          : 0
      }));
    }
  }

  /**
   * Clean old connection logs
   * @param daysToKeep Days to keep logs
   * @returns Number of cleaned logs
   */
  async cleanOldLogs(daysToKeep = 30): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('clean_old_connection_logs', {
        p_days_to_keep: daysToKeep
      });

      if (error) {
        throw new Error(`Failed to clean old logs: ${error.message}`);
      }

      return data as number;
    } catch (error) {
      console.error('Error cleaning old logs:', error);

      // Fallback to direct delete if RPC fails
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error: deleteError, count } = await this.client
        .from('connection_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (deleteError) {
        throw new Error(`Failed to clean old logs: ${deleteError.message}`);
      }

      return count || 0;
    }
  }
}