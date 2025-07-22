/**
 * CategoriaRepository Tests
 * Tests for the CategoriaRepository class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockCategoria } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';
import { ValidationError, NotFoundError } from '../../src/core/errors/index.js';

// Mock the CategoriaRepository class
// Note: This assumes there's a CategoriaRepository class in the project
// If the actual path is different, adjust accordingly
vi.mock('../../src/repositories/CategoriaRepository', async (importOriginal) => {
  // Import the original module
  const originalModule = await importOriginal();
  
  // Create a mock class that extends the original
  return {
    ...originalModule,
    CategoriaRepository: vi.fn().mockImplementation((options) => {
      // Create an instance of the original class
      const original = new originalModule.CategoriaRepository(options);
      
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
import { CategoriaRepository } from '../../src/repositories/CategoriaRepository';

describe('CategoriaRepository', () => {
  let repository: any; // Using any to avoid TypeScript errors with the mocked class
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    
    // Create repository instance
    repository = new CategoriaRepository({
      supabaseClient: mockSupabaseClient
    });
    
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('buscarPorParentId', () => {
    it('should return subcategories for a parent category', async () => {
      // Arrange
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const mockCategorias = [
        createMockCategoria({ parent_id: parentId }),
        createMockCategoria({ parent_id: parentId })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockCategorias,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorParentId(parentId);

      // Assert
      expect(result).toEqual(mockCategorias);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categorias');
    });

    it('should return root categories when parentId is null', async () => {
      // Arrange
      const mockCategorias = [
        createMockCategoria({ parent_id: null }),
        createMockCategoria({ parent_id: null })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockCategorias,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorParentId(null);

      // Assert
      expect(result).toEqual(mockCategorias);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categorias');
    });

    it('should return empty array when no subcategories found', async () => {
      // Arrange
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      
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
      const result = await repository.buscarPorParentId(parentId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const parentId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorParentId(parentId);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarHierarquia', () => {
    it('should return category hierarchy from root to specified category', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
      const mockCategoria = createMockCategoria({
        id: categoryId,
        nome: 'Child Category',
        parent_id: '223e4567-e89b-12d3-a456-426614174000'
      });
      
      const mockParentCategoria = createMockCategoria({
        id: '223e4567-e89b-12d3-a456-426614174000',
        nome: 'Parent Category',
        parent_id: null
      });

      // Mock the Supabase client response for first query (get category)
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockCategoria,
          error: null
        })
      }));

      // Mock the Supabase client response for second query (get parent)
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockParentCategoria,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarHierarquia(categoryId);

      // Assert
      expect(result).toEqual([mockParentCategoria, mockCategoria]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categorias');
    });

    it('should return single category when it has no parent', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
      const mockCategoria = createMockCategoria({
        id: categoryId,
        nome: 'Root Category',
        parent_id: null
      });

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: mockCategoria,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarHierarquia(categoryId);

      // Assert
      expect(result).toEqual([mockCategoria]);
    });

    it('should throw not found error when category does not exist', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
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

      // Act & Assert
      await expect(repository.buscarHierarquia(categoryId)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid category ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarHierarquia('invalid-id')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarArvoreCompleta', () => {
    it('should return complete category tree', async () => {
      // Arrange
      const mockRootCategorias = [
        createMockCategoria({ id: '1', parent_id: null, nome: 'Root 1' }),
        createMockCategoria({ id: '2', parent_id: null, nome: 'Root 2' })
      ];
      
      const mockSubcategorias1 = [
        createMockCategoria({ id: '3', parent_id: '1', nome: 'Child 1.1' }),
        createMockCategoria({ id: '4', parent_id: '1', nome: 'Child 1.2' })
      ];
      
      const mockSubcategorias2 = [
        createMockCategoria({ id: '5', parent_id: '2', nome: 'Child 2.1' })
      ];
      
      const mockSubSubcategorias = [
        createMockCategoria({ id: '6', parent_id: '3', nome: 'Child 1.1.1' })
      ];

      // Mock the Supabase client response for root categories
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockRootCategorias,
          error: null
        })
      }));

      // Mock responses for subcategories queries
      // For Root 1
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockSubcategorias1,
          error: null
        })
      }));
      
      // For Root 2
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockSubcategorias2,
          error: null
        })
      }));
      
      // For Child 1.1
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockSubSubcategorias,
          error: null
        })
      }));
      
      // For Child 1.2
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));
      
      // For Child 2.1
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));
      
      // For Child 1.1.1
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
      const result = await repository.buscarArvoreCompleta();

      // Assert
      expect(result).toHaveLength(2); // Two root categories
      expect(result[0].subcategorias).toHaveLength(2); // Root 1 has two children
      expect(result[1].subcategorias).toHaveLength(1); // Root 2 has one child
      expect(result[0].subcategorias[0].subcategorias).toHaveLength(1); // Child 1.1 has one child
      expect(result[0].subcategorias[1].subcategorias).toHaveLength(0); // Child 1.2 has no children
      expect(result[1].subcategorias[0].subcategorias).toHaveLength(0); // Child 2.1 has no children
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));

      // Act
      const result = await repository.buscarArvoreCompleta();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarArvoreCompleta();

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('moverCategoria', () => {
    it('should move category to new parent successfully', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const newParentId = '223e4567-e89b-12d3-a456-426614174000';
      
      // Mock existePorId for category
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
      
      // Mock existePorId for new parent
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
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.moverCategoria(categoryId, newParentId);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categorias');
    });

    it('should move category to root level when newParentId is null', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock existePorId for category
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
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.moverCategoria(categoryId, null);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw not found error when category does not exist', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const newParentId = '223e4567-e89b-12d3-a456-426614174000';
      
      // Mock existePorId for category to return false
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
      await expect(repository.moverCategoria(categoryId, newParentId)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw not found error when new parent does not exist', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const newParentId = '223e4567-e89b-12d3-a456-426614174000';
      
      // Mock existePorId for category to return true
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
      
      // Mock existePorId for new parent to return false
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
      await expect(repository.moverCategoria(categoryId, newParentId)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error when trying to move category to itself', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act & Assert
      await expect(repository.moverCategoria(categoryId, categoryId)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid category ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.moverCategoria('invalid-id', null)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('contarSubcategorias', () => {
    it('should return count of subcategories', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const subcategoriesCount = 5;
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: subcategoriesCount,
          error: null,
          count: subcategoriesCount
        })
      }));

      // Act
      const result = await repository.contarSubcategorias(categoryId);

      // Assert
      expect(result).toBe(subcategoriesCount);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categorias');
    });

    it('should return 0 when no subcategories exist', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
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
      const result = await repository.contarSubcategorias(categoryId);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.contarSubcategorias(categoryId);

      // Assert
      expect(result).toBe(0);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid category ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.contarSubcategorias('invalid-id')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });
});