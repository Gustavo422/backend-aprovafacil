/**
 * Concurso Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRepository, createMockConcurso } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the base service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { ConcursoService } from '../../src/services/ConcursoService';

// Define Concurso interface
interface Concurso {
  id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  status: string;
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

// Mock ConcursoService class
class ConcursoService extends BaseService<Concurso> {
  constructor(repository: any) {
    super(repository);
  }

  async findByStatus(status: string): Promise<Concurso[]> {
    return this.repository.findByStatus(status);
  }

  async findActive(): Promise<Concurso[]> {
    return this.repository.findActive();
  }

  async findUpcoming(): Promise<Concurso[]> {
    return this.repository.findUpcoming();
  }

  async findPast(): Promise<Concurso[]> {
    return this.repository.findPast();
  }

  async updateStatus(id: string, status: string): Promise<Concurso | null> {
    if (!this.isValidStatus(status)) {
      throw new Error('Invalid status');
    }
    return this.repository.updateStatus(id, status);
  }

  async findWithFilters(filters: Record<string, any>): Promise<Concurso[]> {
    return this.repository.findWithFilters(filters);
  }

  async findWithPagination(page: number, pageSize: number): Promise<Concurso[]> {
    if (page < 1) throw new Error('Page must be greater than 0');
    if (pageSize < 1 || pageSize > 100) throw new Error('Page size must be between 1 and 100');
    
    return this.repository.findWithPagination(page, pageSize);
  }

  async countConcursos(): Promise<number> {
    return this.repository.countConcursos();
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Concurso[]> {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      throw new Error('Invalid date format');
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }
    
    return this.repository.findByDateRange(startDate, endDate);
  }

  async createConcurso(concursoData: Partial<Concurso>): Promise<Concurso> {
    // Validate required fields
    if (!concursoData.nome) {
      throw new Error('Nome is required');
    }
    
    if (!concursoData.data_inicio || !concursoData.data_fim) {
      throw new Error('Data início and data fim are required');
    }
    
    if (!this.isValidDate(concursoData.data_inicio) || !this.isValidDate(concursoData.data_fim)) {
      throw new Error('Invalid date format');
    }
    
    if (new Date(concursoData.data_inicio) > new Date(concursoData.data_fim)) {
      throw new Error('Data início must be before data fim');
    }
    
    // Set default status if not provided
    if (!concursoData.status) {
      concursoData.status = 'ativo';
    }
    
    return this.repository.create(concursoData);
  }

  private isValidStatus(status: string): boolean {
    const validStatuses = ['ativo', 'inativo', 'encerrado', 'cancelado', 'rascunho'];
    return validStatuses.includes(status);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}

describe('ConcursoService', () => {
  let mockRepository: any;
  let service: ConcursoService;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockRepository = createMockRepository({
      findByStatus: vi.fn(),
      findActive: vi.fn(),
      findUpcoming: vi.fn(),
      findPast: vi.fn(),
      updateStatus: vi.fn(),
      findWithFilters: vi.fn(),
      findWithPagination: vi.fn(),
      countConcursos: vi.fn(),
      findByDateRange: vi.fn()
    });
    service = new ConcursoService(mockRepository);
  });
  
  describe('findByStatus', () => {
    it('should find concursos by status', async () => {
      // Arrange
      const status = 'ativo';
      const expectedConcursos = [
        createMockConcurso({ status }),
        createMockConcurso({ status })
      ];
      
      mockRepository.findByStatus.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findByStatus(status);
      
      // Assert
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(status);
      expect(results).toEqual(expectedConcursos);
    });
    
    it('should return empty array when no concursos with status are found', async () => {
      // Arrange
      const status = 'nonexistent';
      
      mockRepository.findByStatus.mockResolvedValue([]);
      
      // Act
      const results = await service.findByStatus(status);
      
      // Assert
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(status);
      expect(results).toEqual([]);
    });
  });
  
  describe('findActive', () => {
    it('should find active concursos', async () => {
      // Arrange
      const expectedConcursos = [
        createMockConcurso({ status: 'ativo', data_inicio: '2023-01-01T00:00:00Z', data_fim: '2025-01-01T00:00:00Z' }),
        createMockConcurso({ status: 'ativo', data_inicio: '2023-02-01T00:00:00Z', data_fim: '2025-02-01T00:00:00Z' })
      ];
      
      mockRepository.findActive.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findActive();
      
      // Assert
      expect(mockRepository.findActive).toHaveBeenCalled();
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findUpcoming', () => {
    it('should find upcoming concursos', async () => {
      // Arrange
      const expectedConcursos = [
        createMockConcurso({ status: 'ativo', data_inicio: '2025-01-01T00:00:00Z', data_fim: '2025-02-01T00:00:00Z' }),
        createMockConcurso({ status: 'ativo', data_inicio: '2025-02-01T00:00:00Z', data_fim: '2025-03-01T00:00:00Z' })
      ];
      
      mockRepository.findUpcoming.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findUpcoming();
      
      // Assert
      expect(mockRepository.findUpcoming).toHaveBeenCalled();
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findPast', () => {
    it('should find past concursos', async () => {
      // Arrange
      const expectedConcursos = [
        createMockConcurso({ status: 'encerrado', data_inicio: '2022-01-01T00:00:00Z', data_fim: '2022-02-01T00:00:00Z' }),
        createMockConcurso({ status: 'encerrado', data_inicio: '2022-02-01T00:00:00Z', data_fim: '2022-03-01T00:00:00Z' })
      ];
      
      mockRepository.findPast.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findPast();
      
      // Assert
      expect(mockRepository.findPast).toHaveBeenCalled();
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('updateStatus', () => {
    it('should update concurso status successfully', async () => {
      // Arrange
      const id = '123';
      const status = 'encerrado';
      const expectedResult = {
        id,
        nome: 'Concurso Test',
        status,
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: '2023-02-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.updateStatus.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.updateStatus(id, status);
      
      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(id, status);
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate status when updating', async () => {
      // Arrange
      const id = '123';
      const status = 'invalid-status';
      
      // Act & Assert
      await expect(service.updateStatus(id, status)).rejects.toThrow('Invalid status');
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
  
  describe('findWithFilters', () => {
    it('should find concursos with filters', async () => {
      // Arrange
      const filters = {
        status: 'ativo',
        nome: 'Test'
      };
      const expectedConcursos = [
        createMockConcurso({ status: 'ativo', nome: 'Test Concurso 1' }),
        createMockConcurso({ status: 'ativo', nome: 'Test Concurso 2' })
      ];
      
      mockRepository.findWithFilters.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findWithFilters(filters);
      
      // Assert
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(filters);
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findWithPagination', () => {
    it('should find concursos with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedConcursos = Array(10).fill(null).map(() => createMockConcurso());
      
      mockRepository.findWithPagination.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(page, pageSize);
      expect(results).toEqual(expectedConcursos);
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
  
  describe('countConcursos', () => {
    it('should count total concursos', async () => {
      // Arrange
      const expectedCount = 42;
      
      mockRepository.countConcursos.mockResolvedValue(expectedCount);
      
      // Act
      const result = await service.countConcursos();
      
      // Assert
      expect(mockRepository.countConcursos).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });
  
  describe('findByDateRange', () => {
    it('should find concursos by date range', async () => {
      // Arrange
      const startDate = '2023-01-01T00:00:00Z';
      const endDate = '2023-12-31T23:59:59Z';
      const expectedConcursos = [
        createMockConcurso({ data_inicio: '2023-02-01T00:00:00Z', data_fim: '2023-03-01T00:00:00Z' }),
        createMockConcurso({ data_inicio: '2023-04-01T00:00:00Z', data_fim: '2023-05-01T00:00:00Z' })
      ];
      
      mockRepository.findByDateRange.mockResolvedValue(expectedConcursos);
      
      // Act
      const results = await service.findByDateRange(startDate, endDate);
      
      // Assert
      expect(mockRepository.findByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(results).toEqual(expectedConcursos);
    });
    
    it('should validate date format', async () => {
      // Arrange
      const startDate = 'invalid-date';
      const endDate = '2023-12-31T23:59:59Z';
      
      // Act & Assert
      await expect(service.findByDateRange(startDate, endDate)).rejects.toThrow('Invalid date format');
      expect(mockRepository.findByDateRange).not.toHaveBeenCalled();
    });
    
    it('should validate date range', async () => {
      // Arrange
      const startDate = '2023-12-31T23:59:59Z';
      const endDate = '2023-01-01T00:00:00Z';
      
      // Act & Assert
      await expect(service.findByDateRange(startDate, endDate)).rejects.toThrow('Start date must be before end date');
      expect(mockRepository.findByDateRange).not.toHaveBeenCalled();
    });
  });
  
  describe('createConcurso', () => {
    it('should create a concurso successfully', async () => {
      // Arrange
      const concursoData = {
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: '2023-02-01T00:00:00Z'
      };
      const expectedResult = {
        id: '123',
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: '2023-02-01T00:00:00Z',
        status: 'ativo',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createConcurso(concursoData);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...concursoData,
        status: 'ativo'
      });
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const concursoData = {
        descricao: 'Description'
      };
      
      // Act & Assert
      await expect(service.createConcurso(concursoData)).rejects.toThrow('Nome is required');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should validate date fields', async () => {
      // Arrange
      const concursoData = {
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: 'invalid-date'
      };
      
      // Act & Assert
      await expect(service.createConcurso(concursoData)).rejects.toThrow('Invalid date format');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should validate date range', async () => {
      // Arrange
      const concursoData = {
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-02-01T00:00:00Z',
        data_fim: '2023-01-01T00:00:00Z'
      };
      
      // Act & Assert
      await expect(service.createConcurso(concursoData)).rejects.toThrow('Data início must be before data fim');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should use provided status', async () => {
      // Arrange
      const concursoData = {
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: '2023-02-01T00:00:00Z',
        status: 'rascunho'
      };
      const expectedResult = {
        id: '123',
        nome: 'New Concurso',
        descricao: 'Description',
        data_inicio: '2023-01-01T00:00:00Z',
        data_fim: '2023-02-01T00:00:00Z',
        status: 'rascunho',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createConcurso(concursoData);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(concursoData);
      expect(result).toEqual(expectedResult);
    });
  });
});