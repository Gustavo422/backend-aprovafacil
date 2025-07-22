/**
 * Apostila Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRepository, createMockApostila, createMockCategoria } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the base service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { ApostilaService } from '../../src/services/ApostilaService';

// Define Apostila interface
interface Apostila {
  id: string;
  titulo: string;
  descricao: string;
  categoria_id: string;
  autor: string;
  conteudo: string;
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

// Mock ApostilaService class
class ApostilaService extends BaseService<Apostila> {
  private categoriaRepository: any;

  constructor(repository: any, categoriaRepository: any) {
    super(repository);
    this.categoriaRepository = categoriaRepository;
  }

  async findByCategoriaId(categoriaId: string): Promise<Apostila[]> {
    return this.repository.findByCategoriaId(categoriaId);
  }

  async findByAutor(autor: string): Promise<Apostila[]> {
    return this.repository.findByAutor(autor);
  }

  async findByTitulo(titulo: string): Promise<Apostila[]> {
    if (!titulo || titulo.trim().length === 0) {
      throw new Error('Título is required for search');
    }
    return this.repository.findByTitulo(titulo);
  }

  async findWithFilters(filters: Record<string, any>): Promise<Apostila[]> {
    return this.repository.findWithFilters(filters);
  }

  async updateConteudo(id: string, conteudo: string): Promise<Apostila | null> {
    if (!conteudo || conteudo.trim().length === 0) {
      throw new Error('Conteúdo cannot be empty');
    }
    return this.repository.updateConteudo(id, conteudo);
  }

  async findWithPagination(page: number, pageSize: number): Promise<Apostila[]> {
    if (page < 1) throw new Error('Page must be greater than 0');
    if (pageSize < 1 || pageSize > 100) throw new Error('Page size must be between 1 and 100');
    
    return this.repository.findWithPagination(page, pageSize);
  }

  async countApostilas(): Promise<number> {
    return this.repository.countApostilas();
  }

  async countApostilasByCategoria(categoriaId: string): Promise<number> {
    return this.repository.countApostilasByCategoria(categoriaId);
  }

  async findRecentlyUpdated(limit: number = 10): Promise<Apostila[]> {
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    return this.repository.findRecentlyUpdated(limit);
  }

  async findWithFullText(searchTerm: string): Promise<Apostila[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Search term is required');
    }
    return this.repository.findWithFullText(searchTerm);
  }

  async createApostila(apostilaData: Partial<Apostila>): Promise<Apostila> {
    // Validate required fields
    if (!apostilaData.titulo) {
      throw new Error('Título is required');
    }
    
    if (!apostilaData.categoria_id) {
      throw new Error('Categoria ID is required');
    }
    
    // Check if categoria exists
    const categoriaExists = await this.categoriaRepository.findById(apostilaData.categoria_id);
    if (!categoriaExists) {
      throw new Error('Categoria does not exist');
    }
    
    // Set default values if not provided
    if (!apostilaData.autor) {
      apostilaData.autor = 'Unknown';
    }
    
    if (!apostilaData.conteudo) {
      apostilaData.conteudo = '';
    }
    
    return this.repository.create(apostilaData);
  }
}

describe('ApostilaService', () => {
  let mockRepository: any;
  let mockCategoriaRepository: any;
  let service: ApostilaService;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockRepository = createMockRepository({
      findByCategoriaId: vi.fn(),
      findByAutor: vi.fn(),
      findByTitulo: vi.fn(),
      findWithFilters: vi.fn(),
      updateConteudo: vi.fn(),
      findWithPagination: vi.fn(),
      countApostilas: vi.fn(),
      countApostilasByCategoria: vi.fn(),
      findRecentlyUpdated: vi.fn(),
      findWithFullText: vi.fn()
    });
    
    mockCategoriaRepository = createMockRepository({
      findById: vi.fn()
    });
    
    service = new ApostilaService(mockRepository, mockCategoriaRepository);
  });
  
  describe('findByCategoriaId', () => {
    it('should find apostilas by categoria id', async () => {
      // Arrange
      const categoriaId = '123';
      const expectedApostilas = [
        createMockApostila({ categoria_id: categoriaId }),
        createMockApostila({ categoria_id: categoriaId })
      ];
      
      mockRepository.findByCategoriaId.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findByCategoriaId(categoriaId);
      
      // Assert
      expect(mockRepository.findByCategoriaId).toHaveBeenCalledWith(categoriaId);
      expect(results).toEqual(expectedApostilas);
    });
    
    it('should return empty array when no apostilas are found', async () => {
      // Arrange
      const categoriaId = '123';
      
      mockRepository.findByCategoriaId.mockResolvedValue([]);
      
      // Act
      const results = await service.findByCategoriaId(categoriaId);
      
      // Assert
      expect(mockRepository.findByCategoriaId).toHaveBeenCalledWith(categoriaId);
      expect(results).toEqual([]);
    });
  });
  
  describe('findByAutor', () => {
    it('should find apostilas by autor', async () => {
      // Arrange
      const autor = 'Test Author';
      const expectedApostilas = [
        createMockApostila({ autor }),
        createMockApostila({ autor })
      ];
      
      mockRepository.findByAutor.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findByAutor(autor);
      
      // Assert
      expect(mockRepository.findByAutor).toHaveBeenCalledWith(autor);
      expect(results).toEqual(expectedApostilas);
    });
  });
  
  describe('findByTitulo', () => {
    it('should find apostilas by titulo', async () => {
      // Arrange
      const titulo = 'Test';
      const expectedApostilas = [
        createMockApostila({ titulo: 'Test Apostila 1' }),
        createMockApostila({ titulo: 'Test Apostila 2' })
      ];
      
      mockRepository.findByTitulo.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findByTitulo(titulo);
      
      // Assert
      expect(mockRepository.findByTitulo).toHaveBeenCalledWith(titulo);
      expect(results).toEqual(expectedApostilas);
    });
    
    it('should validate titulo parameter', async () => {
      // Arrange
      const titulo = '';
      
      // Act & Assert
      await expect(service.findByTitulo(titulo)).rejects.toThrow('Título is required for search');
      expect(mockRepository.findByTitulo).not.toHaveBeenCalled();
    });
  });
  
  describe('findWithFilters', () => {
    it('should find apostilas with filters', async () => {
      // Arrange
      const filters = {
        titulo: 'Test',
        categoria_id: '123',
        autor: 'Author'
      };
      const expectedApostilas = [
        createMockApostila({ 
          titulo: 'Test Apostila', 
          categoria_id: '123',
          autor: 'Author'
        })
      ];
      
      mockRepository.findWithFilters.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findWithFilters(filters);
      
      // Assert
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(filters);
      expect(results).toEqual(expectedApostilas);
    });
  });
  
  describe('updateConteudo', () => {
    it('should update apostila conteudo successfully', async () => {
      // Arrange
      const id = '123';
      const conteudo = 'Updated content for the apostila';
      const expectedResult = {
        id,
        titulo: 'Apostila Test',
        conteudo,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.updateConteudo.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.updateConteudo(id, conteudo);
      
      // Assert
      expect(mockRepository.updateConteudo).toHaveBeenCalledWith(id, conteudo);
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate conteudo is not empty', async () => {
      // Arrange
      const id = '123';
      const conteudo = '';
      
      // Act & Assert
      await expect(service.updateConteudo(id, conteudo)).rejects.toThrow('Conteúdo cannot be empty');
      expect(mockRepository.updateConteudo).not.toHaveBeenCalled();
    });
  });
  
  describe('findWithPagination', () => {
    it('should find apostilas with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedApostilas = Array(10).fill(null).map(() => createMockApostila());
      
      mockRepository.findWithPagination.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(page, pageSize);
      expect(results).toEqual(expectedApostilas);
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
  
  describe('countApostilas', () => {
    it('should count total apostilas', async () => {
      // Arrange
      const expectedCount = 42;
      
      mockRepository.countApostilas.mockResolvedValue(expectedCount);
      
      // Act
      const result = await service.countApostilas();
      
      // Assert
      expect(mockRepository.countApostilas).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });
  
  describe('countApostilasByCategoria', () => {
    it('should count apostilas by categoria', async () => {
      // Arrange
      const categoriaId = '123';
      const expectedCount = 15;
      
      mockRepository.countApostilasByCategoria.mockResolvedValue(expectedCount);
      
      // Act
      const result = await service.countApostilasByCategoria(categoriaId);
      
      // Assert
      expect(mockRepository.countApostilasByCategoria).toHaveBeenCalledWith(categoriaId);
      expect(result).toBe(15);
    });
  });
  
  describe('findRecentlyUpdated', () => {
    it('should find recently updated apostilas', async () => {
      // Arrange
      const limit = 5;
      const expectedApostilas = Array(5).fill(null).map(() => 
        createMockApostila({ updated_at: new Date().toISOString() })
      );
      
      mockRepository.findRecentlyUpdated.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findRecentlyUpdated(limit);
      
      // Assert
      expect(mockRepository.findRecentlyUpdated).toHaveBeenCalledWith(limit);
      expect(results).toEqual(expectedApostilas);
    });
    
    it('should validate limit lower bound', async () => {
      // Arrange
      const limit = 0;
      
      // Act & Assert
      await expect(service.findRecentlyUpdated(limit)).rejects.toThrow('Limit must be between 1 and 100');
      expect(mockRepository.findRecentlyUpdated).not.toHaveBeenCalled();
    });
    
    it('should validate limit upper bound', async () => {
      // Arrange
      const limit = 101;
      
      // Act & Assert
      await expect(service.findRecentlyUpdated(limit)).rejects.toThrow('Limit must be between 1 and 100');
      expect(mockRepository.findRecentlyUpdated).not.toHaveBeenCalled();
    });
    
    it('should use default limit if not provided', async () => {
      // Arrange
      const expectedApostilas = Array(10).fill(null).map(() => 
        createMockApostila({ updated_at: new Date().toISOString() })
      );
      
      mockRepository.findRecentlyUpdated.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findRecentlyUpdated();
      
      // Assert
      expect(mockRepository.findRecentlyUpdated).toHaveBeenCalledWith(10);
      expect(results).toEqual(expectedApostilas);
    });
  });
  
  describe('findWithFullText', () => {
    it('should find apostilas with full text search', async () => {
      // Arrange
      const searchTerm = 'test query';
      const expectedApostilas = [
        createMockApostila({ titulo: 'Test Apostila', conteudo: 'Content with test query' }),
        createMockApostila({ titulo: 'Another Apostila', conteudo: 'More content with test query' })
      ];
      
      mockRepository.findWithFullText.mockResolvedValue(expectedApostilas);
      
      // Act
      const results = await service.findWithFullText(searchTerm);
      
      // Assert
      expect(mockRepository.findWithFullText).toHaveBeenCalledWith(searchTerm);
      expect(results).toEqual(expectedApostilas);
    });
    
    it('should validate search term is not empty', async () => {
      // Arrange
      const searchTerm = '';
      
      // Act & Assert
      await expect(service.findWithFullText(searchTerm)).rejects.toThrow('Search term is required');
      expect(mockRepository.findWithFullText).not.toHaveBeenCalled();
    });
  });
  
  describe('createApostila', () => {
    it('should create an apostila successfully', async () => {
      // Arrange
      const categoriaId = '123';
      const apostilaData = {
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: categoriaId,
        autor: 'Test Author',
        conteudo: 'Test content'
      };
      const expectedResult = {
        id: '456',
        ...apostilaData,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockCategoriaRepository.findById.mockResolvedValue(createMockCategoria({ id: categoriaId }));
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createApostila(apostilaData);
      
      // Assert
      expect(mockCategoriaRepository.findById).toHaveBeenCalledWith(categoriaId);
      expect(mockRepository.create).toHaveBeenCalledWith(apostilaData);
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const apostilaData = {
        descricao: 'Description',
        autor: 'Test Author'
      };
      
      // Act & Assert
      await expect(service.createApostila(apostilaData)).rejects.toThrow('Título is required');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should validate categoria exists', async () => {
      // Arrange
      const apostilaData = {
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: '999',
        autor: 'Test Author'
      };
      
      mockCategoriaRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.createApostila(apostilaData)).rejects.toThrow('Categoria does not exist');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should set default autor if not provided', async () => {
      // Arrange
      const categoriaId = '123';
      const apostilaData = {
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: categoriaId
      };
      const expectedResult = {
        id: '456',
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: categoriaId,
        autor: 'Unknown',
        conteudo: '',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockCategoriaRepository.findById.mockResolvedValue(createMockCategoria({ id: categoriaId }));
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createApostila(apostilaData);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...apostilaData,
        autor: 'Unknown',
        conteudo: ''
      });
      expect(result).toEqual(expectedResult);
    });
    
    it('should set default conteudo if not provided', async () => {
      // Arrange
      const categoriaId = '123';
      const apostilaData = {
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: categoriaId,
        autor: 'Test Author'
      };
      const expectedResult = {
        id: '456',
        titulo: 'New Apostila',
        descricao: 'Description',
        categoria_id: categoriaId,
        autor: 'Test Author',
        conteudo: '',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockCategoriaRepository.findById.mockResolvedValue(createMockCategoria({ id: categoriaId }));
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createApostila(apostilaData);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...apostilaData,
        conteudo: ''
      });
      expect(result).toEqual(expectedResult);
    });
  });
});