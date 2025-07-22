/**
 * MonitoringService Tests
 * Tests for the MonitoringService class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringService } from '../../src/services/MonitoringService';
import { createMockSupabaseClient } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    monitoringService = new MonitoringService(mockSupabaseClient);
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('recordHealthCheck', () => {
    it('should record a health check using RPC when successful', async () => {
      // Arrange
      const checkId = 'test-check-id';
      const checkName = 'database-connection';
      const status = 'healthy';
      const details = { latency: 5, connections: 10 };
      const durationMs = 150;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: checkId,
        error: null
      });

      // Act
      const result = await monitoringService.recordHealthCheck(checkName, status, details, durationMs);

      // Assert
      expect(result).toBe(checkId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_health_check', {
        p_check_name: checkName,
        p_status: status,
        p_details: details,
        p_duration_ms: durationMs
      });
    });

    it('should fall back to direct insert when RPC fails', async () => {
      // Arrange
      const checkName = 'database-connection';
      const status = 'healthy';

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock insert to succeed
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValueOnce({
          data: { id: 'fallback-id' },
          error: null
        })
      }));

      // Act
      const result = await monitoringService.recordHealthCheck(checkName, status);

      // Assert
      expect(result).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('health_checks');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct insert fail', async () => {
      // Arrange
      const checkName = 'database-connection';
      const status = 'healthy';

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock insert to fail
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert error' }
        })
      }));

      // Act & Assert
      await expect(monitoringService.recordHealthCheck(checkName, status)).rejects.toThrow('Failed to record health check: Insert error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('recordSystemMetric', () => {
    it('should record a system metric using RPC when successful', async () => {
      // Arrange
      const metricId = 'test-metric-id';
      const metricName = 'cpu-usage';
      const metricValue = 45.5;
      const details = { server: 'app-server-1' };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: metricId,
        error: null
      });

      // Act
      const result = await monitoringService.recordSystemMetric(metricName, metricValue, details);

      // Assert
      expect(result).toBe(metricId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_system_metric', {
        p_metric_name: metricName,
        p_metric_value: metricValue,
        p_details: details
      });
    });

    it('should fall back to direct insert when RPC fails', async () => {
      // Arrange
      const metricName = 'cpu-usage';
      const metricValue = 45.5;

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock insert to succeed
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValueOnce({
          data: { id: 'fallback-id' },
          error: null
        })
      }));

      // Act
      const result = await monitoringService.recordSystemMetric(metricName, metricValue);

      // Assert
      expect(result).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('system_metrics');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct insert fail', async () => {
      // Arrange
      const metricName = 'cpu-usage';
      const metricValue = 45.5;

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock insert to fail
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert error' }
        })
      }));

      // Act & Assert
      await expect(monitoringService.recordSystemMetric(metricName, metricValue)).rejects.toThrow('Failed to record system metric: Insert error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('getLatestHealthChecks', () => {
    it('should return latest health checks from RPC when successful', async () => {
      // Arrange
      const mockHealthChecks = [
        {
          id: 'check-1',
          check_name: 'database-connection',
          status: 'healthy',
          created_at: '2023-01-01T10:00:00Z'
        },
        {
          id: 'check-2',
          check_name: 'api-gateway',
          status: 'warning',
          created_at: '2023-01-01T11:00:00Z'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockHealthChecks,
        error: null
      });

      // Act
      const result = await monitoringService.getLatestHealthChecks();

      // Assert
      expect(result).toEqual(mockHealthChecks);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_latest_health_checks');
    });

    it('should fall back to direct query when RPC fails', async () => {
      // Arrange
      const mockHealthChecks = [
        {
          id: 'check-1',
          check_name: 'database-connection',
          status: 'healthy',
          created_at: '2023-01-01T10:00:00Z'
        },
        {
          id: 'check-2',
          check_name: 'database-connection',
          status: 'warning',
          created_at: '2023-01-01T11:00:00Z'
        },
        {
          id: 'check-3',
          check_name: 'api-gateway',
          status: 'healthy',
          created_at: '2023-01-01T10:30:00Z'
        }
      ];

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock select to succeed
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: mockHealthChecks,
        error: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        order: mockOrder
      }));

      // Act
      const result = await monitoringService.getLatestHealthChecks();

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(2); // Should have one entry per check_name
      
      // Check that we got the latest entry for each check_name
      const dbCheck = result.find(check => check.check_name === 'database-connection');
      expect(dbCheck?.id).toBe('check-2'); // The later one
      
      const apiCheck = result.find(check => check.check_name === 'api-gateway');
      expect(apiCheck?.id).toBe('check-3');
      
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct query fail', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock select to fail
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Query error' }
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        order: mockOrder
      }));

      // Act & Assert
      await expect(monitoringService.getLatestHealthChecks()).rejects.toThrow('Failed to get health checks: Query error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('getSystemMetricsOverTime', () => {
    it('should return metrics over time from RPC when successful', async () => {
      // Arrange
      const mockMetrics = [
        {
          time_bucket: '2023-01-01T10:00:00Z',
          avg_value: 45.5,
          min_value: 40.0,
          max_value: 50.0
        },
        {
          time_bucket: '2023-01-01T11:00:00Z',
          avg_value: 48.2,
          min_value: 42.5,
          max_value: 55.0
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockMetrics,
        error: null
      });

      const metricName = 'cpu-usage';
      const startDate = new Date('2023-01-01T10:00:00Z');
      const endDate = new Date('2023-01-01T12:00:00Z');
      const interval = '1 hour';

      // Act
      const result = await monitoringService.getSystemMetricsOverTime(metricName, startDate, endDate, interval);

      // Assert
      expect(result).toEqual(mockMetrics);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_system_metrics_over_time', {
        p_metric_name: metricName,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_interval: interval
      });
    });

    it('should fall back to direct query when RPC fails', async () => {
      // Arrange
      const mockMetrics = [
        {
          id: 'metric-1',
          metric_name: 'cpu-usage',
          metric_value: 45.0,
          created_at: '2023-01-01T10:15:00Z'
        },
        {
          id: 'metric-2',
          metric_name: 'cpu-usage',
          metric_value: 46.0,
          created_at: '2023-01-01T10:30:00Z'
        },
        {
          id: 'metric-3',
          metric_name: 'cpu-usage',
          metric_value: 50.0,
          created_at: '2023-01-01T11:15:00Z'
        }
      ];

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock select chain to succeed
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: mockMetrics,
        error: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder
      }));

      const metricName = 'cpu-usage';
      const startDate = new Date('2023-01-01T10:00:00Z');
      const endDate = new Date('2023-01-01T12:00:00Z');
      const interval = '1 hour';

      // Act
      const result = await monitoringService.getSystemMetricsOverTime(metricName, startDate, endDate, interval);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(2); // Should have one entry per hour
      
      // Check that we have correct aggregations
      const firstHour = result.find(m => m.time_bucket.startsWith('2023-01-01T10:'));
      expect(firstHour).toBeDefined();
      expect(firstHour?.avg_value).toBeCloseTo(45.5, 1);
      expect(firstHour?.min_value).toBe(45.0);
      expect(firstHour?.max_value).toBe(46.0);
      
      const secondHour = result.find(m => m.time_bucket.startsWith('2023-01-01T11:'));
      expect(secondHour).toBeDefined();
      expect(secondHour?.avg_value).toBe(50.0);
      expect(secondHour?.min_value).toBe(50.0);
      expect(secondHour?.max_value).toBe(50.0);
      
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct query fail', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock select chain to fail
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Query error' }
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder
      }));

      // Act & Assert
      await expect(monitoringService.getSystemMetricsOverTime('cpu-usage')).rejects.toThrow('Failed to get system metrics: Query error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should use default parameters when not provided', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const metricName = 'cpu-usage';
      
      // Act
      await monitoringService.getSystemMetricsOverTime(metricName);

      // Assert
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_system_metrics_over_time', {
        p_metric_name: metricName,
        p_start_date: expect.any(String),
        p_end_date: expect.any(String),
        p_interval: '1 hour'
      });
    });
  });

  describe('performDatabaseHealthCheck', () => {
    it('should perform database health check using RPC when successful', async () => {
      // Arrange
      const mockHealthCheck = {
        status: 'healthy',
        details: {
          connection_pool: 'ok',
          query_performance: 'ok'
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockHealthCheck,
        error: null
      });

      // Act
      const result = await monitoringService.performDatabaseHealthCheck();

      // Assert
      expect(result).toEqual(mockHealthCheck);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('perform_database_health_check');
    });

    it('should throw an error when RPC fails', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Act & Assert
      await expect(monitoringService.performDatabaseHealthCheck()).rejects.toThrow('Failed to perform database health check: RPC error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('cleanOldMonitoringData', () => {
    it('should clean old monitoring data using RPC when successful', async () => {
      // Arrange
      const deletedCount = 100;
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: deletedCount,
        error: null
      });

      // Act
      const result = await monitoringService.cleanOldMonitoringData(15);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('clean_old_monitoring_data', {
        p_days_to_keep: 15
      });
    });

    it('should fall back to direct delete when RPC fails', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock health checks delete to succeed
      const mockHealthDelete = vi.fn().mockReturnThis();
      const mockHealthLt = vi.fn().mockResolvedValueOnce({
        error: null,
        count: 50
      });

      // Mock system metrics delete to succeed
      const mockMetricsDelete = vi.fn().mockReturnThis();
      const mockMetricsLt = vi.fn().mockResolvedValueOnce({
        error: null,
        count: 70
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: mockHealthDelete,
        lt: mockHealthLt
      })).mockImplementationOnce(() => ({
        delete: mockMetricsDelete,
        lt: mockMetricsLt
      }));

      // Act
      const result = await monitoringService.cleanOldMonitoringData(15);

      // Assert
      expect(result).toBe(120); // 50 + 70
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('health_checks');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('system_metrics');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when health checks delete fails', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock health checks delete to fail
      const mockHealthDelete = vi.fn().mockReturnThis();
      const mockHealthLt = vi.fn().mockResolvedValueOnce({
        error: { message: 'Delete error' },
        count: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: mockHealthDelete,
        lt: mockHealthLt
      }));

      // Act & Assert
      await expect(monitoringService.cleanOldMonitoringData()).rejects.toThrow('Failed to clean old health checks: Delete error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when system metrics delete fails', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock health checks delete to succeed
      const mockHealthDelete = vi.fn().mockReturnThis();
      const mockHealthLt = vi.fn().mockResolvedValueOnce({
        error: null,
        count: 50
      });

      // Mock system metrics delete to fail
      const mockMetricsDelete = vi.fn().mockReturnThis();
      const mockMetricsLt = vi.fn().mockResolvedValueOnce({
        error: { message: 'Delete error' },
        count: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: mockHealthDelete,
        lt: mockHealthLt
      })).mockImplementationOnce(() => ({
        delete: mockMetricsDelete,
        lt: mockMetricsLt
      }));

      // Act & Assert
      await expect(monitoringService.cleanOldMonitoringData()).rejects.toThrow('Failed to clean old system metrics: Delete error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should use default 30 days when no parameter is provided', async () => {
      // Arrange
      const deletedCount = 100;
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: deletedCount,
        error: null
      });

      // Act
      const result = await monitoringService.cleanOldMonitoringData();

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('clean_old_monitoring_data', {
        p_days_to_keep: 30
      });
    });
  });
});