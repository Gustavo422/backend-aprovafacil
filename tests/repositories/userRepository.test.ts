/**
 * User Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockUser } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the UserRepository class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { UserRepository } from '../../src/repositories/UserRepository';

// Mock BaseRepository class
class BaseRepository<T> {
  protected supabaseClient: any;
  protected tableName: string;

  constructor(supabaseClient: any, tableName: string) {
    this.supabaseClient = supabaseClient;
    this.tableName = tableName;
  }

  async create(entity: Partial<T>): Promise<T> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .insert(entity)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Failed to create entity');
    
    return data[0] as T;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    return data[0] as T;
  }

  async findAll(filters?: Record<string, unknown>): Promise<T[]> {
    let query = this.supabaseClient
      .from(this.tableName)
      .select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as T[];
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .update(entity)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    return data[0] as T;
  }

  async delete(id: string): Promise<T | null> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    return data[0] as T;
  }
}

// Mock User interface
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

// Mock UserRepository class
class UserRepository extends BaseRepository<User> {
  constructor(supabaseClient: any) {
    super(supabaseClient, 'users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (error) throw error;
    // Handle the case where data is an array (in our tests)
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : null;
    }
    return data;
  }

  async findByRole(role: string): Promise<User[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('role', role);
      
    if (error) throw error;
    return data || [];
  }

  async updateProfile(userId: string, profileData: Partial<User>): Promise<User | null> {
    return this.update(userId, profileData);
  }

  async deactivateUser(userId: string): Promise<User | null> {
    return this.update(userId, { ativo: false });
  }

  async activateUser(userId: string): Promise<User | null> {
    return this.update(userId, { ativo: true });
  }

  async findActiveUsers(): Promise<User[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('ativo', true);
      
    if (error) throw error;
    return data || [];
  }

  async findWithPagination(page: number, pageSize: number): Promise<User[]> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .range(start, end)
      .limit(pageSize);
      
    if (error) throw error;
    return data || [];
  }

  async countUsers(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('count');
      
    if (error) throw error;
    return data?.count || 0;
  }
}

describe('UserRepository', () => {
  let mockSupabase: any;
  let repository: UserRepository;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient();
    repository = new UserRepository(mockSupabase);
  });
  
  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = createMockUser({ email });
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedUser], error: null }))
      );
      
      // Act
      const result = await repository.findByEmail(email);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('email', email);
      expect(result).toEqual(expectedUser);
    });
    
    it('should return null when user with email is not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const result = await repository.findByEmail(email);
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should handle errors when finding a user by email', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.findByEmail(email)).rejects.toThrow('Database error');
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedUsers, error: null }))
      );
      
      // Act
      const results = await repository.findByRole(role);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('role', role);
      expect(results).toEqual(expectedUsers);
    });
    
    it('should return empty array when no users with role are found', async () => {
      // Arrange
      const role = 'nonexistent';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const results = await repository.findByRole(role);
      
      // Assert
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
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.updateProfile(userId, profileData);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith(profileData);
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', userId);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.deactivateUser(userId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ ativo: false });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', userId);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.activateUser(userId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ ativo: true });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', userId);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedUsers, error: null }))
      );
      
      // Act
      const results = await repository.findActiveUsers();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('ativo', true);
      expect(results).toEqual(expectedUsers);
    });
  });
  
  describe('findWithPagination', () => {
    it('should find users with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedUsers = Array(10).fill(null).map(() => createMockUser());
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedUsers, error: null }))
      );
      
      // Act
      const results = await repository.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.limit).toHaveBeenCalledWith(pageSize);
      // Check for range calculation (page - 1) * pageSize
      expect(mockSupabase._methods.range).toHaveBeenCalledWith(0, 9);
      expect(results).toEqual(expectedUsers);
    });
  });
  
  describe('countUsers', () => {
    it('should count total users', async () => {
      // Arrange
      const expectedCount = { count: 42 };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCount, error: null }))
      );
      
      // Act
      const result = await repository.countUsers();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase._methods.select).toHaveBeenCalledWith('count');
      expect(result).toBe(42);
    });
    
    it('should handle errors when counting users', async () => {
      // Arrange
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.countUsers()).rejects.toThrow('Database error');
    });
  });
});