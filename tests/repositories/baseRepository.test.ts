/**
 * Base Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the BaseRepository class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { BaseRepository } from '../../src/repositories/BaseRepository';

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

// Define a test entity type
interface TestEntity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Create a concrete implementation of BaseRepository for testing
class TestRepository extends BaseRepository<TestEntity> {
  constructor(supabaseClient: any) {
    super(supabaseClient, 'test_table');
  }
  
  // Add a custom method to test repository-specific logic
  async findByName(name: string): Promise<TestEntity | null> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  }
  
  // Add a method with retry logic to test the retry mechanism
  async findWithRetry(id: string, maxRetries = 3): Promise<TestEntity | null> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await this.findById(id);
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return null;
  }
}

describe('BaseRepository', () => {
  let mockSupabase: any;
  let repository: TestRepository;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient();
    repository = new TestRepository(mockSupabase);
  });
  
  describe('create', () => {
    it('should create an entity successfully', async () => {
      // Arrange
      const testEntity = { name: 'Test Entity' };
      const expectedResult = {
        id: '123',
        name: 'Test Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.create(testEntity);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.insert).toHaveBeenCalledWith(testEntity);
      expect(result).toEqual(expectedResult);
    });
    
    it('should handle errors when creating an entity', async () => {
      // Arrange
      const testEntity = { name: 'Test Entity' };
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.create(testEntity)).rejects.toThrow('Database error');
    });
    
    it('should handle empty response when creating an entity', async () => {
      // Arrange
      const testEntity = { name: 'Test Entity' };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act & Assert
      await expect(repository.create(testEntity)).rejects.toThrow('Failed to create entity');
    });
  });
  
  describe('findById', () => {
    it('should find an entity by id', async () => {
      // Arrange
      const id = '123';
      const expectedResult = {
        id: '123',
        name: 'Test Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.findById(id);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
    });
    
    it('should return null when entity is not found', async () => {
      // Arrange
      const id = '123';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const result = await repository.findById(id);
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should handle errors when finding an entity by id', async () => {
      // Arrange
      const id = '123';
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.findById(id)).rejects.toThrow('Database error');
    });
  });
  
  describe('findAll', () => {
    it('should find all entities', async () => {
      // Arrange
      const expectedResults = [
        {
          id: '123',
          name: 'Test Entity 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '456',
          name: 'Test Entity 2',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedResults, error: null }))
      );
      
      // Act
      const results = await repository.findAll();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(results).toEqual(expectedResults);
    });
    
    it('should find entities with filters', async () => {
      // Arrange
      const filters = { status: 'active' };
      const expectedResults = [
        {
          id: '123',
          name: 'Test Entity 1',
          status: 'active',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        }
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedResults, error: null }))
      );
      
      // Act
      const results = await repository.findAll(filters);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      // Verify filter was applied
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('status', 'active');
      expect(results).toEqual(expectedResults);
    });
    
    it('should handle errors when finding all entities', async () => {
      // Arrange
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.findAll()).rejects.toThrow('Database error');
    });
    
    it('should return empty array when no entities are found', async () => {
      // Arrange
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const results = await repository.findAll();
      
      // Assert
      expect(results).toEqual([]);
    });
  });
  
  describe('update', () => {
    it('should update an entity successfully', async () => {
      // Arrange
      const id = '123';
      const updateData = { name: 'Updated Entity' };
      const expectedResult = {
        id: '123',
        name: 'Updated Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.update(id, updateData);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
    });
    
    it('should return null when entity to update is not found', async () => {
      // Arrange
      const id = '123';
      const updateData = { name: 'Updated Entity' };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const result = await repository.update(id, updateData);
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should handle errors when updating an entity', async () => {
      // Arrange
      const id = '123';
      const updateData = { name: 'Updated Entity' };
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.update(id, updateData)).rejects.toThrow('Database error');
    });
  });
  
  describe('delete', () => {
    it('should delete an entity successfully', async () => {
      // Arrange
      const id = '123';
      const expectedResult = {
        id: '123',
        name: 'Test Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.delete(id);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.delete).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
    });
    
    it('should return null when entity to delete is not found', async () => {
      // Arrange
      const id = '123';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const result = await repository.delete(id);
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should handle errors when deleting an entity', async () => {
      // Arrange
      const id = '123';
      const expectedError = new Error('Database error');
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.delete(id)).rejects.toThrow('Database error');
    });
  });
  
  describe('custom methods', () => {
    it('should find entity by name', async () => {
      // Arrange
      const name = 'Test Entity';
      const expectedResult = {
        id: '123',
        name: 'Test Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedResult, error: null }))
      );
      
      // Act
      const result = await repository.findByName(name);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('name', name);
      expect(result).toEqual(expectedResult);
    });
    
    it('should retry finding an entity when it fails', async () => {
      // Arrange
      const id = '123';
      const expectedResult = {
        id: '123',
        name: 'Test Entity',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      // First attempt fails
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: null, error: new Error('Temporary error') }))
      );
      
      // Second attempt succeeds
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.findWithRetry(id, 2);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabase._methods.select).toHaveBeenCalledTimes(2);
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
    });
    
    it('should fail after maximum retries', async () => {
      // Arrange
      const id = '123';
      const expectedError = new Error('Persistent error');
      
      // All attempts fail
      mockSupabase._methods.then.mockImplementation((callback) => 
        Promise.resolve(callback({ data: null, error: expectedError }))
      );
      
      // Act & Assert
      await expect(repository.findWithRetry(id, 3)).rejects.toThrow('Persistent error');
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
      expect(mockSupabase._methods.select).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('error handling', () => {
    it('should handle connection errors', async () => {
      // Arrange
      const connectionError = new Error('Connection error');
      connectionError.name = 'ConnectionError';
      
      mockSupabase.from.mockImplementationOnce(() => {
        throw connectionError;
      });
      
      // Act & Assert
      await expectToThrow(
        () => repository.findAll(),
        Error,
        'Connection error'
      );
    });
    
    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Timeout error');
      timeoutError.name = 'TimeoutError';
      
      mockSupabase.from.mockImplementationOnce(() => {
        throw timeoutError;
      });
      
      // Act & Assert
      await expectToThrow(
        () => repository.findAll(),
        Error,
        'Timeout error'
      );
    });
  });
});