/**
 * ApostilaRepository Tests
 * Tests for the ApostilaRepository class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockApostila } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';
import { ValidationError, NotFoundError } from '../../src/core/errors/index.js';

// Mock the ApostilaRepository class
// Note: This assumes there's a ApostilaRepository class in the project
// If the actual path is different, adjust accordingly
vi.mock('../../src/repositories/ApostilaRepository', async (importOriginal) => {
  // Import the original module
  const originalModule = await importOriginal();
  
  // Create a mock class that extends the original
  return {
    ...originalModule,
    ApostilaRepository: vi.fn().mockImplementation((options) => {
      // Create an instance of the original class
      const original = new originalModule.ApostilaRepository(options);
      
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
import { ApostilaRepository } from '../../src/repositories/ApostilaRepository';

describe('ApostilaRepository', () => {
  let repository: any; // Using any to avoid TypeScript errors with the mocked class
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    
    // Create repository instance
    repository = new ApostilaRepository({
      supabaseClient: mockSupabaseClient
    });
    
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('buscarPorCategoria', () => {
    it('should return apostilas for a specific category', async () => {
      // Arrange
      const categoriaId = '123e4567-e89b-12d3-a456-426614174000';
      
      const mockApostilas = [
        createMockApostila({ categoria_id: categoriaId }),
        createMockApostila({ categoria_id: categoriaId })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockApostilas,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorCategoria(categoriaId);

      // Assert
      expect(result).toEqual(mockApostilas);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should return empty array when no apostilas found for category', async () => {
      // Arrange
      const categoriaId = '123e4567-e89b-12d3-a456-426614174000';
      
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
      const result = await repository.buscarPorCategoria(categoriaId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw validation error for invalid category ID', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorCategoria('invalid-id')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const categoriaId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorCategoria(categoriaId);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorAutor', () => {
    it('should return apostilas by a specific author', async () => {
      // Arrange
      const autor = 'Test Author';
      
      const mockApostilas = [
        createMockApostila({ autor }),
        createMockApostila({ autor })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockApostilas,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorAutor(autor);

      // Assert
      expect(result).toEqual(mockApostilas);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should return empty array when no apostilas found for author', async () => {
      // Arrange
      const autor = 'Nonexistent Author';
      
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
      const result = await repository.buscarPorAutor(autor);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw validation error for empty author name', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorAutor('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const autor = 'Test Author';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorAutor(autor);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorTitulo', () => {
    it('should return apostilas matching title pattern', async () => {
      // Arrange
      const titulo = 'Test';
      
      const mockApostilas = [
        createMockApostila({ titulo: 'Test Apostila 1' }),
        createMockApostila({ titulo: 'Another Test Apostila' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockApostilas,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorTitulo(titulo);

      // Assert
      expect(result).toEqual(mockApostilas);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should return empty array when no apostilas match title pattern', async () => {
      // Arrange
      const titulo = 'Nonexistent';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorTitulo(titulo);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw validation error for empty title', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorTitulo('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const titulo = 'Test';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorTitulo(titulo);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorConteudo', () => {
    it('should return apostilas with content matching search term', async () => {
      // Arrange
      const termo = 'specific content';
      
      const mockApostilas = [
        createMockApostila({ conteudo: 'This is a specific content example' }),
        createMockApostila({ conteudo: 'Another example with specific content inside' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockApostilas,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorConteudo(termo);

      // Assert
      expect(result).toEqual(mockApostilas);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should return empty array when no apostilas match content search', async () => {
      // Arrange
      const termo = 'nonexistent content';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorConteudo(termo);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw validation error for empty search term', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorConteudo('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const termo = 'specific content';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorConteudo(termo);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('atualizarConteudo', () => {
    it('should update apostila content successfully', async () => {
      // Arrange
      const apostilaId = '123e4567-e89b-12d3-a456-426614174000';
      const novoConteudo = 'New content for the apostila';
      
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
        eq: vi.fn().mockResolvedValueOnce({
          error: null
        })
      }));

      // Act
      const result = await repository.atualizarConteudo(apostilaId, novoConteudo);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should throw not found error when apostila does not exist', async () => {
      // Arrange
      const apostilaId = '123e4567-e89b-12d3-a456-426614174000';
      const novoConteudo = 'New content for the apostila';
      
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
      await expect(repository.atualizarConteudo(apostilaId, novoConteudo)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid apostila ID', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';
      const novoConteudo = 'New content for the apostila';

      // Act & Assert
      await expect(repository.atualizarConteudo(invalidId, novoConteudo)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for empty content', async () => {
      // Arrange
      const apostilaId = '123e4567-e89b-12d3-a456-426614174000';
      const emptyContent = '';

      // Act & Assert
      await expect(repository.atualizarConteudo(apostilaId, emptyContent)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should return false when update fails', async () => {
      // Arrange
      const apostilaId = '123e4567-e89b-12d3-a456-426614174000';
      const novoConteudo = 'New content for the apostila';
      
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
      
      // Mock update to fail
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          error: { message: 'Update failed' }
        })
      }));

      // Act
      const result = await repository.atualizarConteudo(apostilaId, novoConteudo);

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('contarPorCategoria', () => {
    it('should return count of apostilas by category', async () => {
      // Arrange
      const categoriaIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '223e4567-e89b-12d3-a456-426614174000'
      ];
      
      // Mock the Supabase client response for first category
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 3,
          error: null,
          count: 3
        })
      }));
      
      // Mock the Supabase client response for second category
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: 2,
          error: null,
          count: 2
        })
      }));

      // Act
      const result = await repository.contarPorCategoria(categoriaIds);

      // Assert
      expect(result).toEqual({
        [categoriaIds[0]]: 3,
        [categoriaIds[1]]: 2
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('apostilas');
    });

    it('should return zero counts when no apostilas found', async () => {
      // Arrange
      const categoriaIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '223e4567-e89b-12d3-a456-426614174000'
      ];
      
      // Mock the Supabase client response for first category
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
      
      // Mock the Supabase client response for second category
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
      const result = await repository.contarPorCategoria(categoriaIds);

      // Assert
      expect(result).toEqual({
        [categoriaIds[0]]: 0,
        [categoriaIds[1]]: 0
      });
    });

    it('should return empty object when no category IDs provided', async () => {
      // Arrange & Act
      const result = await repository.contarPorCategoria([]);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const categoriaIds = ['123e4567-e89b-12d3-a456-426614174000'];
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.contarPorCategoria(categoriaIds);

      // Assert
      expect(result).toEqual({
        [categoriaIds[0]]: 0
      });
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid category IDs', async () => {
      // Arrange
      const invalidIds = ['not-a-uuid'];

      // Act & Assert
      await expect(repository.contarPorCategoria(invalidIds)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });
});