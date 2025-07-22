/**
 * Base Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRepository } from '../utils/mockFactory';

// Mock the base service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { BaseService } from '../../src/services/BaseService';

// Define a test entity type
interface TestEntity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
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

// Create a concrete implementation of BaseService for testing
class TestService extends BaseService<TestEntity> {
  constructor(repository: any) {
    super(repository);
  }
  
  // Add a custom method to test service-specific logic
  async findByName(name: string): Promise<TestEntity | null> {
    const allEntities = await this.repository.findAll();
    return allEntities.find((entity: TestEntity) => entity.name === name) || null;
  }
}

describe('BaseService', () => {
  let mockRepository: any;
  let service: TestService;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockRepository = createMockRepository();
    service = new TestService(mockRepository);
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
      
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.create(testEntity);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(testEntity);
      expect(result).toEqual(expectedResult);
    });
    
    it('should handle errors when creating an entity', async () => {
      // Arrange
      const testEntity = { name: 'Test Entity' };
      const expectedError = new Error('Repository error');
      
      mockRepository.create.mockRejectedValue(expectedError);
      
      // Act & Assert
      await expect(service.create(testEntity)).rejects.toThrow('Repository error');
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
      
      mockRepository.findById.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.findById(id);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
    
    it('should return null when entity is not found', async () => {
      // Arrange
      const id = '123';
      
      mockRepository.findById.mockResolvedValue(null);
      
      // Act
      const result = await service.findById(id);
      
      // Assert
      expect(result).toBeNull();
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
      
      mockRepository.findAll.mockResolvedValue(expectedResults);
      
      // Act
      const results = await service.findAll();
      
      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(results).toEqual(expectedResults);
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
      
      mockRepository.update.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.update(id, updateData);
      
      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(id, updateData);
      expect(result).toEqual(expectedResult);
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
      
      mockRepository.delete.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.delete(id);
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('custom methods', () => {
    it('should find entity by name', async () => {
      // Arrange
      const name = 'Test Entity 1';
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
      
      mockRepository.findAll.mockResolvedValue(expectedResults);
      
      // Act
      const result = await service.findByName(name);
      
      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResults[0]);
    });
    
    it('should return null when entity with name is not found', async () => {
      // Arrange
      const name = 'Non-existent Entity';
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
      
      mockRepository.findAll.mockResolvedValue(expectedResults);
      
      // Act
      const result = await service.findByName(name);
      
      // Assert
      expect(result).toBeNull();
    });
  });
});