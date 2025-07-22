/**
 * ConcursoRepository Tests
 * Tests for the ConcursoRepository class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockConcurso } from '../utils/mockFactory';
import { mockConsole } from '../utils/testUtils';
import { ValidationError, NotFoundError } from '../../src/core/errors/index.js';

// Mock the ConcursoRepository class
// Note: This assumes there's a ConcursoRepository class in the project
// If the actual path is different, adjust accordingly
vi.mock('../../src/repositories/ConcursoRepository', async (importOriginal) => {
  // Import the original module
  const originalModule = await importOriginal();
  
  // Create a mock class that extends the original
  return {
    ...originalModule,
    ConcursoRepository: vi.fn().mockImplementation((options) => {
      // Create an instance of the original class
      const original = new originalModule.ConcursoRepository(options);
      
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
import { ConcursoRepository } from '../../src/repositories/ConcursoRepository';

describe('ConcursoRepository', () => {
  let repository: any; // Using any to avoid TypeScript errors with the mocked class
  let mockSupabaseClient: any;
  let consoleMock: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = createMockSupabaseClient();
    
    // Create repository instance
    repository = new ConcursoRepository({
      supabaseClient: mockSupabaseClient
    });
    
    consoleMock = mockConsole();
  });

  afterEach(() => {
    // Restore console mocks
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('buscarPorStatus', () => {
    it('should return concursos with specified status', async () => {
      // Arrange
      const mockConcursos = [
        createMockConcurso({ status: 'ativo' }),
        createMockConcurso({ status: 'ativo' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockConcursos,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorStatus('ativo');

      // Assert
      expect(result).toEqual(mockConcursos);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concursos');
    });

    it('should return empty array when no concursos found with status', async () => {
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
      const result = await repository.buscarPorStatus('encerrado');

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw validation error for invalid status', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorStatus('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarPorPeriodo', () => {
    it('should return concursos within specified date range', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      const mockConcursos = [
        createMockConcurso({ 
          data_inicio: '2023-02-01T00:00:00Z',
          data_fim: '2023-03-01T00:00:00Z'
        }),
        createMockConcurso({ 
          data_inicio: '2023-05-01T00:00:00Z',
          data_fim: '2023-06-01T00:00:00Z'
        })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockConcursos,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorPeriodo(startDate, endDate);

      // Assert
      expect(result).toEqual(mockConcursos);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concursos');
    });

    it('should throw validation error when end date is before start date', async () => {
      // Arrange
      const startDate = new Date('2023-12-31');
      const endDate = new Date('2023-01-01');

      // Act & Assert
      await expect(repository.buscarPorPeriodo(startDate, endDate)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorPeriodo(startDate, endDate);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('buscarAtivos', () => {
    it('should return active concursos', async () => {
      // Arrange
      const mockConcursos = [
        createMockConcurso({ status: 'ativo' }),
        createMockConcurso({ status: 'ativo' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockConcursos,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarAtivos();

      // Assert
      expect(result).toEqual(mockConcursos);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concursos');
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

  describe('buscarPorNome', () => {
    it('should return concursos matching the name pattern', async () => {
      // Arrange
      const searchTerm = 'Concurso';
      
      const mockConcursos = [
        createMockConcurso({ nome: 'Concurso Público 2023' }),
        createMockConcurso({ nome: 'Concurso Interno 2023' })
      ];

      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockConcursos,
          error: null
        })
      }));

      // Act
      const result = await repository.buscarPorNome(searchTerm);

      // Assert
      expect(result).toEqual(mockConcursos);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concursos');
    });

    it('should throw validation error for empty search term', async () => {
      // Arrange & Act & Assert
      await expect(repository.buscarPorNome('')).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const searchTerm = 'Concurso';
      
      // Mock the Supabase client response
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.buscarPorNome(searchTerm);

      // Assert
      expect(result).toEqual([]);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('atualizarStatus', () => {
    it('should update concurso status successfully', async () => {
      // Arrange
      const concursoId = '123e4567-e89b-12d3-a456-426614174000';
      const newStatus = 'encerrado';

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
      const result = await repository.atualizarStatus(concursoId, newStatus);

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concursos');
    });

    it('should throw not found error when concurso does not exist', async () => {
      // Arrange
      const concursoId = '123e4567-e89b-12d3-a456-426614174000';
      const newStatus = 'encerrado';

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
      await expect(repository.atualizarStatus(concursoId, newStatus)).rejects.toThrow(NotFoundError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should throw validation error for invalid status', async () => {
      // Arrange
      const concursoId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidStatus = 'invalid-status';

      // Act & Assert
      await expect(repository.atualizarStatus(concursoId, invalidStatus)).rejects.toThrow(ValidationError);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });

    it('should return false when update fails', async () => {
      // Arrange
      const concursoId = '123e4567-e89b-12d3-a456-426614174000';
      const newStatus = 'encerrado';

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
      const result = await repository.atualizarStatus(concursoId, newStatus);

      // Assert
      expect(result).toBe(false);
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('contarPorStatus', () => {
    it('should return count of concursos by status', async () => {
      // Arrange
      const mockCounts = {
        ativo: 5,
        encerrado: 3,
        rascunho: 2
      };

      // Mock the Supabase client response for each status
      // First call for 'ativo'
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: mockCounts.ativo,
          error: null,
          count: mockCounts.ativo
        })
      }));

      // Second call for 'encerrado'
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: mockCounts.encerrado,
          error: null,
          count: mockCounts.encerrado
        })
      }));

      // Third call for 'rascunho'
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValueOnce({
          data: mockCounts.rascunho,
          error: null,
          count: mockCounts.rascunho
        })
      }));

      // Act
      const result = await repository.contarPorStatus();

      // Assert
      expect(result).toEqual(mockCounts);
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(3);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      // Mock the Supabase client to throw an error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        count: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));

      // Act
      const result = await repository.contarPorStatus();

      // Assert
      expect(result).toEqual({ ativo: 0, encerrado: 0, rascunho: 0 });
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });
});