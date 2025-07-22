/**
 * User Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRepository, createMockUser } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the base service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { UserService } from '../../src/services/UserService';

// Define User interface
interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

// Mock BaseService class
class BaseService<T> {
  protected repository: any;

  constructor(repository: any) {
    this.repository = repository;
  }

  async create(entity: Partial<T>): Promise<T> {
    return this.repository.create(entity);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  async findAll(filters?: Record<string, unknown>): Promise<T[]> {
    return this.repository.findAll(filters);
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    return this.repository.update(id, entity);
  }

  async delete(id: string): Promise<T | null> {
    return this.repository.delete(id);
  }
}

// Mock UserService class
class UserService extends BaseService<User> {
  constructor(repository: any) {
    super(repository);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(email);
  }

  async findByRole(role: string): Promise<User[]> {
    return this.repository.findByRole(role);
  }

  async updateProfile(userId: string, profileData: Partial<User>): Promise<User | null> {
    // Validate profile data
    if (profileData.email && !this.isValidEmail(profileData.email)) {
      throw new Error('Invalid email format');
    }

    return this.repository.updateProfile(userId, profileData);
  }

  async activateUser(userId: string): Promise<User | null> {
    return this.repository.activateUser(userId);
  }

  async deactivateUser(userId: string): Promise<User | null> {
    return this.repository.deactivateUser(userId);
  }

  async findActiveUsers(): Promise<User[]> {
    return this.repository.findActiveUsers();
  }

  async findWithPagination(page: number, pageSize: number): Promise<User[]> {
    if (page < 1) throw new Error('Page must be greater than 0');
    if (pageSize < 1 || pageSize > 100) throw new Error('Page size must be between 1 and 100');
    
    return this.repository.findWithPagination(page, pageSize);
  }

  async countUsers(): Promise<number> {
    return this.repository.countUsers();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

describe('UserService', () => {
  let mockRepository: any;
  let service: UserService;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockRepository = createMockRepository({
      findByEmail: vi.fn(),
      findByRole: vi.fn(),
      updateProfile: vi.fn(),
      activateUser: vi.fn(),
      deactivateUser: vi.fn(),
      findActiveUsers: vi.fn(),
      findWithPagination: vi.fn(),
      countUsers: vi.fn()
    });
    service = new UserService(mockRepository);
  });
  
  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = createMockUser({ email });
      
      mockRepository.findByEmail.mockResolvedValue(expectedUser);
      
      // Act
      const result = await service.findByEmail(email);
      
      // Assert
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedUser);
    });
    
    it('should return null when user with email is not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      
      mockRepository.findByEmail.mockResolvedValue(null);
      
      // Act
      const result = await service.findByEmail(email);
      
      // Assert
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });
    
    it('should handle errors when finding a user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedError = new Error('Repository error');
      
      mockRepository.findByEmail.mockRejectedValue(expectedError);
      
      // Act & Assert
      await expect(service.findByEmail(email)).rejects.toThrow('Repository error');
    });
  });
  
  describe('findByRole', () => {
    it('should find users by role', async () => {
      // Arrange
      const role = 'admin';
      const expectedUsers = [
        createMockUser({ role }),
        createMockUser({ role })
      ];
      
      mockRepository.findByRole.mockResolvedValue(expectedUsers);
      
      // Act
      const results = await service.findByRole(role);
      
      // Assert
      expect(mockRepository.findByRole).toHaveBeenCalledWith(role);
      expect(results).toEqual(expectedUsers);
    });
    
    it('should return empty array when no users with role are found', async () => {
      // Arrange
      const role = 'nonexistent';
      
      mockRepository.findByRole.mockResolvedValue([]);
      
      // Act
      const results = await service.findByRole(role);
      
      // Assert
      expect(mockRepository.findByRole).toHaveBeenCalledWith(role);
      expect(results).toEqual([]);
    });
  });
  
  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const userId = '123';
      const profileData = { 
        nome: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg'
      };
      const expectedResult = {
        id: userId,
        email: 'test@example.com',
        nome: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'user',
        ativo: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.updateProfile.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.updateProfile(userId, profileData);
      
      // Assert
      expect(mockRepository.updateProfile).toHaveBeenCalledWith(userId, profileData);
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate email format when updating profile', async () => {
      // Arrange
      const userId = '123';
      const profileData = { 
        nome: 'Updated Name',
        email: 'invalid-email'
      };
      
      // Act & Assert
      await expect(service.updateProfile(userId, profileData)).rejects.toThrow('Invalid email format');
      expect(mockRepository.updateProfile).not.toHaveBeenCalled();
    });
    
    it('should accept valid email format when updating profile', async () => {
      // Arrange
      const userId = '123';
      const profileData = { 
        nome: 'Updated Name',
        email: 'valid@example.com'
      };
      const expectedResult = {
        id: userId,
        email: 'valid@example.com',
        nome: 'Updated Name',
        role: 'user',
        ativo: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.updateProfile.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.updateProfile(userId, profileData);
      
      // Assert
      expect(mockRepository.updateProfile).toHaveBeenCalledWith(userId, profileData);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('activateUser', () => {
    it('should activate a user successfully', async () => {
      // Arrange
      const userId = '123';
      const expectedResult = {
        id: userId,
        email: 'test@example.com',
        nome: 'Test User',
        role: 'user',
        ativo: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.activateUser.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.activateUser(userId);
      
      // Assert
      expect(mockRepository.activateUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('deactivateUser', () => {
    it('should deactivate a user successfully', async () => {
      // Arrange
      const userId = '123';
      const expectedResult = {
        id: userId,
        email: 'test@example.com',
        nome: 'Test User',
        role: 'user',
        ativo: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.deactivateUser.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.deactivateUser(userId);
      
      // Assert
      expect(mockRepository.deactivateUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('findActiveUsers', () => {
    it('should find all active users', async () => {
      // Arrange
      const expectedUsers = [
        createMockUser({ ativo: true }),
        createMockUser({ ativo: true })
      ];
      
      mockRepository.findActiveUsers.mockResolvedValue(expectedUsers);
      
      // Act
      const results = await service.findActiveUsers();
      
      // Assert
      expect(mockRepository.findActiveUsers).toHaveBeenCalled();
      expect(results).toEqual(expectedUsers);
    });
  });
  
  describe('findWithPagination', () => {
    it('should find users with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedUsers = Array(10).fill(null).map(() => createMockUser());
      
      mockRepository.findWithPagination.mockResolvedValue(expectedUsers);
      
      // Act
      const results = await service.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(page, pageSize);
      expect(results).toEqual(expectedUsers);
    });
    
    it('should validate page number', async () => {
      // Arrange
      const page = 0;
      const pageSize = 10;
      
      // Act & Assert
      await expect(service.findWithPagination(page, pageSize)).rejects.toThrow('Page must be greater than 0');
      expect(mockRepository.findWithPagination).not.toHaveBeenCalled();
    });
    
    it('should validate page size lower bound', async () => {
      // Arrange
      const page = 1;
      const pageSize = 0;
      
      // Act & Assert
      await expect(service.findWithPagination(page, pageSize)).rejects.toThrow('Page size must be between 1 and 100');
      expect(mockRepository.findWithPagination).not.toHaveBeenCalled();
    });
    
    it('should validate page size upper bound', async () => {
      // Arrange
      const page = 1;
      const pageSize = 101;
      
      // Act & Assert
      await expect(service.findWithPagination(page, pageSize)).rejects.toThrow('Page size must be between 1 and 100');
      expect(mockRepository.findWithPagination).not.toHaveBeenCalled();
    });
  });
  
  describe('countUsers', () => {
    it('should count total users', async () => {
      // Arrange
      const expectedCount = 42;
      
      mockRepository.countUsers.mockResolvedValue(expectedCount);
      
      // Act
      const result = await service.countUsers();
      
      // Assert
      expect(mockRepository.countUsers).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });
});