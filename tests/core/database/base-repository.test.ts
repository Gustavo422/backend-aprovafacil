/**
 * BaseRepository Tests
 * Tests for the BaseRepository class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseRepository, BaseRepositoryOptions } from '../../../src/core/database/base-repository';
import { createMockSupabaseClient } from '../../utils/mockFactory';
import { mockConsole } from '../../utils/testUtils';
import { FiltroBase } from '../../../src/shared/types/index.js';
import { ValidationError, NotFoundError, DatabaseError } from '../../../src/core/errors/index.js';

// Define a test entity interface
interface TestEntity {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Define a test filter interface
interface TestFilter extends FiltroBase {
  name?: string;
  active?: boolean;
}

// Create a concrete implementation of BaseRepository for testing
class TestRepository extends BaseRepository<TestEntity, TestFilter> {
  constructor(options: BaseRepositoryOptions) {
    super(options);
  }

  // Override applyFilters to test filter functionality
  protected applyFilters(query: any, filtro: TestFilter): any {
    if (filtro.name) {
      query = query.ilike('name', `%${filtro.name}%`);
    }
    
    if (filtro.active !== undefined) {
      query = query.eq('active', filtro.active);
    }
    
    return query;
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    
    // Create repository instance
    repository = new TestRepository({
      tableName: 'test_entities',
      supabaseClient: mockSupabaseClient
    });
    
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('buscarPorId', () => {
    it('should return entity when found', async () => {
      // Arrange
      const mockEntity: TestEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        description: 'Test Description',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockEntity,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorId(mockEntity.id);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_entities');
    });

    it('should return null when entity not found', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

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
      const result = await repository.buscarPorId(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client to throw an error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValueOnce(new Error('Database connection error'))
      }));

      // Act
      const result = await repository.buscarPorId(id);

      // Assert
      expect(result).toBeNull();
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should validate UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(repository.buscarPorId(invalidId)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should apply soft delete filter when enabled', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create repository with soft delete enabled
      const softDeleteRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        softDelete: true
      });

      // Mock the filter method to verify it's called
      const mockFilter = vi.fn().mockReturnThis();
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: mockFilter,
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null
        })
      }));

      // Act
      await softDeleteRepository.buscarPorId(id);

      // Assert
      expect(mockFilter).toHaveBeenCalledWith('deleted_at', 'is', null);
    });
  });

  describe('buscarTodos', () => {
    it('should return paginated entities', async () => {
      // Arrange
      const mockEntities: TestEntity[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Entity 1',
          active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          name: 'Test Entity 2',
          active: true,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: mockEntities,
          error: null,
          count: 2
        })
      }));

      // Act
      const result = await repository.buscarTodos();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntities);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const filter: TestFilter = {
        page: 2,
        limit: 5,
        sort_by: 'name',
        sort_order: 'asc',
        name: 'test',
        active: true
      };

      // Mock methods to verify they're called
      const mockIlike = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        ilike: mockIlike,
        eq: mockEq,
        order: mockOrder,
        range: mockRange
      }));

      // Act
      await repository.buscarTodos(filter);

      // Assert
      expect(mockIlike).toHaveBeenCalledWith('name', '%test%');
      expect(mockEq).toHaveBeenCalledWith('active', true);
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
      expect(mockRange).toHaveBeenCalledWith(5, 9); // (page-1)*limit to (page-1)*limit + limit - 1
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock the Supabase client to throw an error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockRejectedValueOnce(new Error('Database connection error'))
      }));

      // Act
      const result = await repository.buscarTodos();

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toBeDefined();
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should apply soft delete filter when enabled', async () => {
      // Arrange
      // Create repository with soft delete enabled
      const softDeleteRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        softDelete: true
      });

      // Mock the filter method to verify it's called
      const mockFilter = vi.fn().mockReturnThis();
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        filter: mockFilter,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
          count: 0
        })
      }));

      // Act
      await softDeleteRepository.buscarTodos();

      // Assert
      expect(mockFilter).toHaveBeenCalledWith('deleted_at', 'is', null);
    });
  });

  describe('criar', () => {
    it('should create entity successfully', async () => {
      // Arrange
      const newEntity = {
        name: 'New Entity',
        description: 'New Description',
        active: true
      };

      const createdEntity: TestEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Entity',
        description: 'New Description',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: createdEntity,
          error: null
        })
      }));

      // Act
      const result = await repository.criar(newEntity);

      // Assert
      expect(result).toEqual(createdEntity);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_entities');
    });

    it('should add timestamps when creating entity', async () => {
      // Arrange
      const newEntity = {
        name: 'New Entity',
        active: true
      };

      // Mock the insert method to capture the inserted data
      const mockInsert = vi.fn().mockReturnThis();
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: '123' },
          error: null
        })
      }));

      // Act
      await repository.criar(newEntity);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Entity',
        active: true,
        criado_em: expect.any(String),
        atualizado_em: expect.any(String)
      }));
    });

    it('should throw validation error for empty data', async () => {
      // Arrange
      const emptyEntity = {};

      // Act & Assert
      await expect(repository.criar(emptyEntity)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw database error when creation fails', async () => {
      // Arrange
      const newEntity = {
        name: 'New Entity',
        active: true
      };

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert error' }
        })
      }));

      // Act & Assert
      await expect(repository.criar(newEntity)).rejects.toThrow(DatabaseError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('should update entity successfully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Entity',
        description: 'Updated Description'
      };

      const updatedEntity: TestEntity = {
        id,
        name: 'Updated Entity',
        description: 'Updated Description',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      // Mock existePorId to return true
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Mock update
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: updatedEntity,
          error: null
        })
      }));

      // Act
      const result = await repository.atualizar(id, updateData);

      // Assert
      expect(result).toEqual(updatedEntity);
    });

    it('should throw not found error when entity does not exist', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Entity'
      };

      // Mock existePorId to return false
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 0,
          error: null,
          count: 0
        })
      }));

      // Act & Assert
      await expect(repository.atualizar(id, updateData)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid ID', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';
      const updateData = {
        name: 'Updated Entity'
      };

      // Act & Assert
      await expect(repository.atualizar(invalidId, updateData)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for empty update data', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const emptyUpdateData = {};

      // Act & Assert
      await expect(repository.atualizar(id, emptyUpdateData)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should update timestamp when updating entity', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Entity'
      };

      // Mock existePorId to return true
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Mock update and capture the update data
      const mockUpdate = vi.fn().mockReturnThis();
      
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id },
          error: null
        })
      }));

      // Act
      await repository.atualizar(id, updateData);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Entity',
        atualizado_em: expect.any(String)
      }));
    });

    it('should apply soft delete filter when enabled', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Entity'
      };
      
      // Create repository with soft delete enabled
      const softDeleteRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        softDelete: true
      });

      // Mock existePorId to return true
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Mock the filter method to verify it's called
      const mockFilter = vi.fn().mockReturnThis();
      
      // Mock update
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: mockFilter,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id },
          error: null
        })
      }));

      // Act
      await softDeleteRepository.atualizar(id, updateData);

      // Assert
      expect(mockFilter).toHaveBeenCalledWith('deleted_at', 'is', null);
    });
  });

  describe('excluir', () => {
    it('should delete entity successfully with hard delete', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock existePorId to return true
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Mock delete
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.excluir(id);

      // Assert
      expect(result).toBe(true);
    });

    it('should perform soft delete when enabled', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create repository with soft delete enabled
      const softDeleteRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        softDelete: true
      });

      // Mock existePorId to return true
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Mock update for soft delete and capture the update data
      const mockUpdate = vi.fn().mockReturnThis();
      
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await softDeleteRepository.excluir(id);

      // Assert
      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String)
      }));
    });

    it('should throw not found error when entity does not exist', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock existePorId to return false
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 0,
          error: null,
          count: 0
        })
      }));

      // Act & Assert
      await expect(repository.excluir(id)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid ID', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';

      // Act & Assert
      await expect(repository.excluir(invalidId)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('existePorId', () => {
    it('should return true when entity exists', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 1,
          error: null,
          count: 1
        })
      }));

      // Act
      const result = await repository.existePorId(id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when entity does not exist', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 0,
          error: null,
          count: 0
        })
      }));

      // Act
      const result = await repository.existePorId(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should apply soft delete filter when enabled', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create repository with soft delete enabled
      const softDeleteRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        softDelete: true
      });

      // Mock the filter method to verify it's called
      const mockFilter = vi.fn().mockReturnThis();
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: mockFilter,
        count: vi.fn().mockResolvedValueOnce({
          data: 0,
          error: null,
          count: 0
        })
      }));

      // Act
      await softDeleteRepository.existePorId(id);

      // Assert
      expect(mockFilter).toHaveBeenCalledWith('deleted_at', 'is', null);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Mock the Supabase client to throw an error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockRejectedValueOnce(new Error('Database connection error'))
      }));

      // Act
      const result = await repository.existePorId(id);

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('executeWithRetry', () => {
    it('should retry on retryable errors', async () => {
      // Arrange
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'connection_error' } })
        .mockResolvedValueOnce({ data: { id: '123' }, error: null });

      // Create a repository with custom retry options
      const retryRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        retryOptions: {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
          retryableErrors: ['connection_error']
        }
      });

      // Use private method via any type assertion
      const executeWithRetry = (retryRepository as any).executeWithRetry.bind(retryRepository);

      // Act
      const result = await executeWithRetry(mockQueryFn);

      // Assert
      expect(result).toEqual({ data: { id: '123' }, error: null });
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const mockQueryFn = vi.fn()
        .mockResolvedValue({ data: null, error: { message: 'connection_error' } });

      // Create a repository with custom retry options
      const retryRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        retryOptions: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
          retryableErrors: ['connection_error']
        }
      });

      // Use private method via any type assertion
      const executeWithRetry = (retryRepository as any).executeWithRetry.bind(retryRepository);

      // Act & Assert
      await expect(executeWithRetry(mockQueryFn)).rejects.toThrow(DatabaseError);
      expect(mockQueryFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      // Arrange
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'validation_error' } });

      // Create a repository with custom retry options
      const retryRepository = new TestRepository({
        tableName: 'test_entities',
        supabaseClient: mockSupabaseClient,
        retryOptions: {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
          retryableErrors: ['connection_error', 'timeout']
        }
      });

      // Use private method via any type assertion
      const executeWithRetry = (retryRepository as any).executeWithRetry.bind(retryRepository);

      // Act
      const result = await executeWithRetry(mockQueryFn);

      // Assert
      expect(result).toEqual({ data: null, error: { message: 'validation_error' } });
      expect(mockQueryFn).toHaveBeenCalledTimes(1); // No retries
    });
  });
});