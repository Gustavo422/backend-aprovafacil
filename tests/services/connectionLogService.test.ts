/**
 * ConnectionLogService Tests
 * Tests for the ConnectionLogService class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionLogService } from '../../src/services/ConnectionLogService';
import { createMockSupabaseClient } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';

describe('ConnectionLogService', () => {
  let connectionLogService: ConnectionLogService;
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    connectionLogService = new ConnectionLogService(mockSupabaseClient);
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log an event using RPC when successful', async () => {
      // Arrange
      const eventId = 'test-event-id';
      const eventType = 'test-event';
      const status = 'success';
      const options = {
        userId: 'user-123',
        requestPath: '/api/test',
        requestMethod: 'GET',
        responseStatus: 200,
        durationMs: 150,
        clientInfo: { browser: 'Chrome' },
        metadata: { test: true }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: eventId,
        error: null
      });

      // Act
      const result = await connectionLogService.logEvent(eventType, status, options);

      // Assert
      expect(result).toBe(eventId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('log_connection_event', {
        p_user_id: options.userId,
        p_event_type: eventType,
        p_status: status,
        p_error_message: null,
        p_request_path: options.requestPath,
        p_request_method: options.requestMethod,
        p_response_status: options.responseStatus,
        p_duration_ms: options.durationMs,
        p_client_info: options.clientInfo,
        p_metadata: options.metadata
      });
    });

    it('should fall back to direct insert when RPC fails', async () => {
      // Arrange
      const eventType = 'test-event';
      const status = 'success';
      const options = {
        userId: 'user-123',
        requestPath: '/api/test'
      };

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
      const result = await connectionLogService.logEvent(eventType, status, options);

      // Assert
      expect(result).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('connection_logs');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct insert fail', async () => {
      // Arrange
      const eventType = 'test-event';
      const status = 'success';

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
      await expect(connectionLogService.logEvent(eventType, status)).rejects.toThrow('Failed to log connection event: Insert error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('logSuccessfulConnection', () => {
    it('should call logEvent with correct parameters', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        requestPath: '/api/test',
        durationMs: 150
      };
      const spy = vi.spyOn(connectionLogService, 'logEvent').mockResolvedValueOnce('success-log-id');

      // Act
      const result = await connectionLogService.logSuccessfulConnection(options);

      // Assert
      expect(result).toBe('success-log-id');
      expect(spy).toHaveBeenCalledWith('connection', 'success', options);
    });
  });

  describe('logFailedConnection', () => {
    it('should call logEvent with correct parameters including error message', async () => {
      // Arrange
      const errorMessage = 'Connection timeout';
      const options = {
        userId: 'user-123',
        requestPath: '/api/test',
        durationMs: 150
      };
      const spy = vi.spyOn(connectionLogService, 'logEvent').mockResolvedValueOnce('error-log-id');

      // Act
      const result = await connectionLogService.logFailedConnection(errorMessage, options);

      // Assert
      expect(result).toBe('error-log-id');
      expect(spy).toHaveBeenCalledWith('connection', 'error', {
        ...options,
        errorMessage
      });
    });
  });

  describe('getConnectionStatistics', () => {
    it('should return statistics from RPC when successful', async () => {
      // Arrange
      const mockStats = [
        {
          date: '2023-01-01',
          total_connections: 100,
          successful_connections: 95,
          failed_connections: 5,
          avg_duration_ms: 120
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockStats,
        error: null
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-07');

      // Act
      const result = await connectionLogService.getConnectionStatistics(startDate, endDate);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_connection_statistics', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });
    });

    it('should fall back to direct query when RPC fails', async () => {
      // Arrange
      const mockLogs = [
        {
          timestamp: '2023-01-01T10:00:00Z',
          status: 'success',
          duration_ms: 100
        },
        {
          timestamp: '2023-01-01T11:00:00Z',
          status: 'success',
          duration_ms: 120
        },
        {
          timestamp: '2023-01-01T12:00:00Z',
          status: 'error',
          duration_ms: 200
        }
      ];

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock select to succeed
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        data: mockLogs,
        error: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        eq: mockEq
      }));

      // Act
      const result = await connectionLogService.getConnectionStatistics();

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(1); // One day of data
      expect(result[0].total_connections).toBe(3);
      expect(result[0].successful_connections).toBe(2);
      expect(result[0].failed_connections).toBe(1);
      expect(result[0].avg_duration_ms).toBe((100 + 120 + 200) / 3);
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
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Query error' }
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        eq: mockEq
      }));

      // Act & Assert
      await expect(connectionLogService.getConnectionStatistics()).rejects.toThrow('Failed to get connection logs: Query error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('cleanOldLogs', () => {
    it('should clean logs using RPC when successful', async () => {
      // Arrange
      const deletedCount = 50;
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: deletedCount,
        error: null
      });

      // Act
      const result = await connectionLogService.cleanOldLogs(15);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('clean_old_connection_logs', {
        p_days_to_keep: 15
      });
    });

    it('should fall back to direct delete when RPC fails', async () => {
      // Arrange
      const deletedCount = 30;

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock delete to succeed
      const mockDelete = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockResolvedValueOnce({
        error: null,
        count: deletedCount
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: mockDelete,
        lt: mockLt
      }));

      // Act
      const result = await connectionLogService.cleanOldLogs(15);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('connection_logs');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct delete fail', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock delete to fail
      const mockDelete = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockResolvedValueOnce({
        error: { message: 'Delete error' },
        count: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: mockDelete,
        lt: mockLt
      }));

      // Act & Assert
      await expect(connectionLogService.cleanOldLogs()).rejects.toThrow('Failed to clean old logs: Delete error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should use default 30 days when no parameter is provided', async () => {
      // Arrange
      const deletedCount = 50;
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: deletedCount,
        error: null
      });

      // Act
      const result = await connectionLogService.cleanOldLogs();

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('clean_old_connection_logs', {
        p_days_to_keep: 30
      });
    });
  });
});