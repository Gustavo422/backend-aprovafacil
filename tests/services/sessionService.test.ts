/**
 * SessionService Tests
 * Tests for the SessionService class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '../../src/services/SessionService';
import { createMockSupabaseClient } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    sessionService = new SessionService(mockSupabaseClient);
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session using RPC when successful', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '127.0.0.1';
      const deviceId = 'device-123';
      const deviceName = 'Test Device';
      const expiresInDays = 15;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: sessionId,
        error: null
      });

      // Act
      const result = await sessionService.createSession(
        userId,
        refreshToken,
        userAgent,
        ipAddress,
        deviceId,
        deviceName,
        expiresInDays
      );

      // Assert
      expect(result).toBe(sessionId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('manage_user_session', {
        p_user_id: userId,
        p_refresh_token: refreshToken,
        p_user_agent: userAgent,
        p_ip_address: ipAddress,
        p_device_id: deviceId,
        p_device_name: deviceName,
        p_expires_in_days: expiresInDays
      });
    });

    it('should fall back to direct insert when RPC fails', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '127.0.0.1';

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
      const result = await sessionService.createSession(userId, refreshToken, userAgent, ipAddress);

      // Assert
      expect(result).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct insert fail', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '127.0.0.1';

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
      await expect(sessionService.createSession(userId, refreshToken, userAgent, ipAddress))
        .rejects.toThrow('Failed to create session: Insert error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should use default expiration when not provided', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '127.0.0.1';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: sessionId,
        error: null
      });

      // Act
      await sessionService.createSession(userId, refreshToken, userAgent, ipAddress);

      // Assert
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('manage_user_session', {
        p_user_id: userId,
        p_refresh_token: refreshToken,
        p_user_agent: userAgent,
        p_ip_address: ipAddress,
        p_device_id: undefined,
        p_device_name: undefined,
        p_expires_in_days: 30 // Default value
      });
    });
  });

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      // Arrange
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token: 'refresh-token-123',
        user_agent: 'Mozilla/5.0',
        ip_address: '127.0.0.1',
        is_active: true,
        created_at: '2023-01-01T10:00:00Z',
        expires_at: '2023-02-01T10:00:00Z',
        last_active_at: '2023-01-01T10:00:00Z'
      };

      // Mock select chain
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockSession,
        error: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      }));

      // Act
      const result = await sessionService.getSessionById('session-123');

      // Assert
      expect(result).toEqual(mockSession);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should return null when session not found', async () => {
      // Arrange
      // Mock select chain
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      }));

      // Act
      const result = await sessionService.getSessionById('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('getSessionByRefreshToken', () => {
    it('should return session when found', async () => {
      // Arrange
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token: 'refresh-token-123',
        is_active: true
      };

      // Mock select chain
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockSession,
        error: null
      });

      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: mockSelect,
        eq: vi.fn()
          .mockImplementationOnce(() => ({ eq: mockEq2, single: mockSingle }))
          .mockImplementationOnce(() => ({ single: mockSingle }))
      }));

      // Act
      const result = await sessionService.getSessionByRefreshToken('refresh-token-123');

      // Assert
      expect(result).toEqual(mockSession);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should return null when session not found', async () => {
      // Arrange
      // Mock select chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockImplementationOnce(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Not found' }
            })
          }))
        }))
      }));

      // Act
      const result = await sessionService.getSessionByRefreshToken('non-existent-token');

      // Assert
      expect(result).toBeNull();
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('getActiveSessionsForUser', () => {
    it('should return active sessions for user', async () => {
      // Arrange
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          is_active: true,
          last_active_at: '2023-01-02T10:00:00Z'
        },
        {
          id: 'session-2',
          user_id: 'user-123',
          is_active: true,
          last_active_at: '2023-01-01T10:00:00Z'
        }
      ];

      // Mock select chain
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockImplementationOnce(() => ({
            order: vi.fn().mockResolvedValueOnce({
              data: mockSessions,
              error: null
            })
          }))
        }))
      }));

      // Act
      const result = await sessionService.getActiveSessionsForUser('user-123');

      // Assert
      expect(result).toEqual(mockSessions);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should return empty array when error occurs', async () => {
      // Arrange
      // Mock select chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockImplementationOnce(() => ({
            order: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Query error' }
            })
          }))
        }))
      }));

      // Act
      const result = await sessionService.getActiveSessionsForUser('user-123');

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity successfully', async () => {
      // Arrange
      // Mock update chain
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockResolvedValueOnce({
            error: null
          })
        }))
      }));

      // Act
      const result = await sessionService.updateSessionActivity('session-123');

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should return false when update fails', async () => {
      // Arrange
      // Mock update chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockResolvedValueOnce({
            error: { message: 'Update error' }
          })
        }))
      }));

      // Act
      const result = await sessionService.updateSessionActivity('session-123');

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      // Arrange
      // Mock update chain
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockResolvedValueOnce({
            error: null
          })
        }))
      }));

      // Act
      const result = await sessionService.invalidateSession('session-123');

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should return false when invalidation fails', async () => {
      // Arrange
      // Mock update chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockResolvedValueOnce({
            error: { message: 'Update error' }
          })
        }))
      }));

      // Act
      const result = await sessionService.invalidateSession('session-123');

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('invalidateOtherSessions', () => {
    it('should invalidate other sessions using RPC when successful', async () => {
      // Arrange
      const invalidatedCount = 3;
      const userId = 'user-123';
      const currentSessionId = 'session-123';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: invalidatedCount,
        error: null
      });

      // Act
      const result = await sessionService.invalidateOtherSessions(userId, currentSessionId);

      // Assert
      expect(result).toBe(invalidatedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('invalidate_user_sessions', {
        p_user_id: userId,
        p_exclude_session_id: currentSessionId
      });
    });

    it('should fall back to direct update when RPC fails', async () => {
      // Arrange
      const invalidatedCount = 2;
      const userId = 'user-123';
      const currentSessionId = 'session-123';

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock update chain
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockImplementationOnce(() => ({
            neq: vi.fn().mockImplementationOnce(() => ({
              eq: vi.fn().mockResolvedValueOnce({
                error: null,
                count: invalidatedCount
              })
            }))
          }))
        }))
      }));

      // Act
      const result = await sessionService.invalidateOtherSessions(userId, currentSessionId);

      // Assert
      expect(result).toBe(invalidatedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct update fail', async () => {
      // Arrange
      const userId = 'user-123';
      const currentSessionId = 'session-123';

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock update chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockImplementationOnce(() => ({
          eq: vi.fn().mockImplementationOnce(() => ({
            neq: vi.fn().mockImplementationOnce(() => ({
              eq: vi.fn().mockResolvedValueOnce({
                error: { message: 'Update error' },
                count: null
              })
            }))
          }))
        }))
      }));

      // Act & Assert
      await expect(sessionService.invalidateOtherSessions(userId, currentSessionId))
        .rejects.toThrow('Failed to invalidate sessions: Update error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('cleanExpiredSessions', () => {
    it('should clean expired sessions using RPC when successful', async () => {
      // Arrange
      const cleanedCount = 5;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: cleanedCount,
        error: null
      });

      // Act
      const result = await sessionService.cleanExpiredSessions();

      // Assert
      expect(result).toBe(cleanedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('clean_expired_sessions');
    });

    it('should fall back to direct delete when RPC fails', async () => {
      // Arrange
      const cleanedCount = 3;

      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock delete chain
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockImplementationOnce(() => ({
          lt: vi.fn().mockResolvedValueOnce({
            error: null,
            count: cleanedCount
          })
        }))
      }));

      // Act
      const result = await sessionService.cleanExpiredSessions();

      // Assert
      expect(result).toBe(cleanedCount);
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw an error when both RPC and direct delete fail', async () => {
      // Arrange
      // Mock RPC to fail
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' }
      });

      // Mock delete chain with error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockImplementationOnce(() => ({
          lt: vi.fn().mockResolvedValueOnce({
            error: { message: 'Delete error' },
            count: null
          })
        }))
      }));

      // Act & Assert
      await expect(sessionService.cleanExpiredSessions())
        .rejects.toThrow('Failed to clean expired sessions: Delete error');
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });
});