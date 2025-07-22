/**
 * UserRepository Tests
 * Tests for the UserRepository class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockUser } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';
import { ValidationError, NotFoundError } from '../../src/core/errors/index.js';

// Mock the UserRepository class
// Note: This assumes there's a UserRepository class in the project
// If the actual path is different, adjust accordingly
vi.mock('../../src/repositories/UserRepository', async (importOriginal) => {
  // Import the original module
  const originalModule = await importOriginal();
  
  // Create a mock class that extends the original
  return {
    ...originalModule,
    UserRepository: vi.fn().mockImplementation((options) => {
      // Create an instance of the original class
      const original = new originalModule.UserRepository(options);
      
      // Spy on all methods
      for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(original))) {
        if (method !== 'constructor' && typeof original[method] === 'function') {
          vi.spyOn(original, method);
        }
      }
      
      return original;
    })
  };
});

// Import the mocked class
import { UserRepository } from '../../src/repositories/UserRepository';

describe('UserRepository', () => {
  let repository: any; // Using any to avoid TypeScript errors with the mocked class
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    
    // Create repository instance
    repository = new UserRepository({
      supabaseClient: mockSupabaseClient
    });
    
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('buscarPorEmail', () => {
    it('should return user when found by email', async () => {
      // Arrange
      const mockUser = createMockUser({ email: 'test@example.com' });

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockUser,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return null when user not found by email', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' }
        })
      }));

      // Act
      const result = await repository.buscarPorEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw validation error for invalid email', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorEmail('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorUsername', () => {
    it('should return user when found by username', async () => {
      // Arrange
      const mockUser = createMockUser({ username: 'testuser' });

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockUser,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorUsername('testuser');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return null when user not found by username', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' }
        })
      }));

      // Act
      const result = await repository.buscarPorUsername('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw validation error for invalid username', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorUsername('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('atualizarUltimoLogin', () => {
    it('should update last login timestamp successfully', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.atualizarUltimoLogin(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return false when update fails', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: { message: 'Update failed' }
        })
      }));

      // Act
      const result = await repository.atualizarUltimoLogin(userId);

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid user ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.atualizarUltimoLogin('invalid-id')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorRole', () => {
    it('should return users with specified role', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({ role: 'admin' }),
        createMockUser({ role: 'admin' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockUsers,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorRole('admin');

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return empty array when no users found with role', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorRole('nonexistent-role');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorRole('admin');

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('atualizarSenha', () => {
    it('should update password hash successfully', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const passwordHash = 'new-password-hash';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.atualizarSenha(userId, passwordHash);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return false when update fails', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const passwordHash = 'new-password-hash';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: { message: 'Update failed' }
        })
      }));

      // Act
      const result = await repository.atualizarSenha(userId, passwordHash);

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid user ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.atualizarSenha('invalid-id', 'password-hash')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for empty password hash', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Act & Assert
      await expect(repository.atualizarSenha(userId, '')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarAtivos', () => {
    it('should return active users', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({ active: true }),
        createMockUser({ active: true })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockUsers,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarAtivos();

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarAtivos();

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });
});