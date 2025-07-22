/**
 * Categoria Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRepository, createMockCategoria } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the base service class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { CategoriaService } from '../../src/services/CategoriaService';

// Define Categoria interface
interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  parent_id: string | null;
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

// Mock CategoriaService class
class CategoriaService extends BaseService<Categoria> {
  constructor(repository: any) {
    super(repository);
  }

  async findRootCategories(): Promise<Categoria[]> {
    return this.repository.findRootCategories();
  }

  async findByParentId(parentId: string): Promise<Categoria[]> {
    return this.repository.findByParentId(parentId);
  }

  async findWithHierarchy(): Promise<(Categoria & { level: number, path: string[] })[]> {
    return this.repository.findWithHierarchy();
  }

  async moveCategory(id: string, newParentId: string | null): Promise<Categoria | null> {
    // Check for circular reference
    if (newParentId) {
      const wouldCreateCircularReference = await this.wouldCreateCircularReference(id, newParentId);
      if (wouldCreateCircularReference) {
        throw new Error('Moving this category would create a circular reference');
      }
    }
    
    return this.repository.moveCategory(id, newParentId);
  }

  async findByName(name: string): Promise<Categoria[]> {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required for search');
    }
    return this.repository.findByName(name);
  }

  async findWithFilters(filters: Record<string, any>): Promise<Categoria[]> {
    return this.repository.findWithFilters(filters);
  }

  async countSubcategories(parentId: string): Promise<number> {
    return this.repository.countSubcategories(parentId);
  }

  async findCategoryPath(categoryId: string): Promise<Categoria[]> {
    return this.repository.findCategoryPath(categoryId);
  }

  async createCategoria(categoriaData: Partial<Categoria>): Promise<Categoria> {
    // Validate required fields
    if (!categoriaData.nome) {
      throw new Error('Nome is required');
    }
    
    // Check parent exists if provided
    if (categoriaData.parent_id) {
      const parentExists = await this.findById(categoriaData.parent_id);
      if (!parentExists) {
        throw new Error('Parent category does not exist');
      }
    }
    
    return this.repository.create(categoriaData);
  }

  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    // Check if the new parent is a descendant of the category
    let currentId = newParentId;
    const visited = new Set<string>();
    
    while (currentId) {
      // Detect cycles
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);
      
      // If we reach the category we're trying to move, it would create a cycle
      if (currentId === categoryId) {
        return true;
      }
      
      // Get the parent of the current category
      const current = await this.findById(currentId);
      if (!current || !current.parent_id) {
        break;
      }
      
      currentId = current.parent_id;
    }
    
    return false;
  }
}

describe('CategoriaService', () => {
  let mockRepository: any;
  let service: CategoriaService;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockRepository = createMockRepository({
      findRootCategories: vi.fn(),
      findByParentId: vi.fn(),
      findWithHierarchy: vi.fn(),
      moveCategory: vi.fn(),
      findByName: vi.fn(),
      findWithFilters: vi.fn(),
      countSubcategories: vi.fn(),
      findCategoryPath: vi.fn()
    });
    service = new CategoriaService(mockRepository);
  });
  
  describe('findRootCategories', () => {
    it('should find root categories', async () => {
      // Arrange
      const expectedCategories = [
        createMockCategoria({ parent_id: null }),
        createMockCategoria({ parent_id: null })
      ];
      
      mockRepository.findRootCategories.mockResolvedValue(expectedCategories);
      
      // Act
      const results = await service.findRootCategories();
      
      // Assert
      expect(mockRepository.findRootCategories).toHaveBeenCalled();
      expect(results).toEqual(expectedCategories);
    });
  });
  
  describe('findByParentId', () => {
    it('should find categories by parent id', async () => {
      // Arrange
      const parentId = '123';
      const expectedCategories = [
        createMockCategoria({ parent_id: parentId }),
        createMockCategoria({ parent_id: parentId })
      ];
      
      mockRepository.findByParentId.mockResolvedValue(expectedCategories);
      
      // Act
      const results = await service.findByParentId(parentId);
      
      // Assert
      expect(mockRepository.findByParentId).toHaveBeenCalledWith(parentId);
      expect(results).toEqual(expectedCategories);
    });
    
    it('should return empty array when no subcategories are found', async () => {
      // Arrange
      const parentId = '123';
      
      mockRepository.findByParentId.mockResolvedValue([]);
      
      // Act
      const results = await service.findByParentId(parentId);
      
      // Assert
      expect(mockRepository.findByParentId).toHaveBeenCalledWith(parentId);
      expect(results).toEqual([]);
    });
  });
  
  describe('findWithHierarchy', () => {
    it('should find categories with hierarchy information', async () => {
      // Arrange
      const expectedCategories = [
        {
          ...createMockCategoria({ parent_id: null }),
          level: 0,
          path: ['Root Category']
        },
        {
          ...createMockCategoria({ parent_id: '123' }),
          level: 1,
          path: ['Root Category', 'Subcategory']
        }
      ];
      
      mockRepository.findWithHierarchy.mockResolvedValue(expectedCategories);
      
      // Act
      const results = await service.findWithHierarchy();
      
      // Assert
      expect(mockRepository.findWithHierarchy).toHaveBeenCalled();
      expect(results).toEqual(expectedCategories);
    });
  });
  
  describe('moveCategory', () => {
    it('should move a category to a new parent', async () => {
      // Arrange
      const id = '123';
      const newParentId = '456';
      const expectedResult = {
        id,
        nome: 'Categoria Test',
        parent_id: newParentId,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      // Mock the wouldCreateCircularReference method
      vi.spyOn(service as any, 'wouldCreateCircularReference').mockResolvedValue(false);
      mockRepository.moveCategory.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.moveCategory(id, newParentId);
      
      // Assert
      expect(mockRepository.moveCategory).toHaveBeenCalledWith(id, newParentId);
      expect(result).toEqual(expectedResult);
    });
    
    it('should handle moving a category to root level', async () => {
      // Arrange
      const id = '123';
      const expectedResult = {
        id,
        nome: 'Categoria Test',
        parent_id: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      };
      
      mockRepository.moveCategory.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.moveCategory(id, null);
      
      // Assert
      expect(mockRepository.moveCategory).toHaveBeenCalledWith(id, null);
      expect(result).toEqual(expectedResult);
    });
    
    it('should prevent circular references', async () => {
      // Arrange
      const id = '123';
      const newParentId = '456';
      
      // Mock the wouldCreateCircularReference method to return true
      vi.spyOn(service as any, 'wouldCreateCircularReference').mockResolvedValue(true);
      
      // Act & Assert
      await expect(service.moveCategory(id, newParentId)).rejects.toThrow('Moving this category would create a circular reference');
      expect(mockRepository.moveCategory).not.toHaveBeenCalled();
    });
  });
  
  describe('findByName', () => {
    it('should find categories by name', async () => {
      // Arrange
      const name = 'Test';
      const expectedCategories = [
        createMockCategoria({ nome: 'Test Category 1' }),
        createMockCategoria({ nome: 'Test Category 2' })
      ];
      
      mockRepository.findByName.mockResolvedValue(expectedCategories);
      
      // Act
      const results = await service.findByName(name);
      
      // Assert
      expect(mockRepository.findByName).toHaveBeenCalledWith(name);
      expect(results).toEqual(expectedCategories);
    });
    
    it('should validate name parameter', async () => {
      // Arrange
      const name = '';
      
      // Act & Assert
      await expect(service.findByName(name)).rejects.toThrow('Name is required for search');
      expect(mockRepository.findByName).not.toHaveBeenCalled();
    });
  });
  
  describe('findWithFilters', () => {
    it('should find categories with filters', async () => {
      // Arrange
      const filters = {
        nome: 'Test',
        parent_id: '123'
      };
      const expectedCategories = [
        createMockCategoria({ nome: 'Test Category', parent_id: '123' }),
        createMockCategoria({ nome: 'Another Test', parent_id: '123' })
      ];
      
      mockRepository.findWithFilters.mockResolvedValue(expectedCategories);
      
      // Act
      const results = await service.findWithFilters(filters);
      
      // Assert
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(filters);
      expect(results).toEqual(expectedCategories);
    });
  });
  
  describe('countSubcategories', () => {
    it('should count subcategories for a parent category', async () => {
      // Arrange
      const parentId = '123';
      const expectedCount = 5;
      
      mockRepository.countSubcategories.mockResolvedValue(expectedCount);
      
      // Act
      const result = await service.countSubcategories(parentId);
      
      // Assert
      expect(mockRepository.countSubcategories).toHaveBeenCalledWith(parentId);
      expect(result).toBe(5);
    });
  });
  
  describe('findCategoryPath', () => {
    it('should find the full path for a category', async () => {
      // Arrange
      const categoryId = '789';
      const expectedPath = [
        createMockCategoria({ id: '123', nome: 'Root', parent_id: null }),
        createMockCategoria({ id: '456', nome: 'Intermediate', parent_id: '123' }),
        createMockCategoria({ id: '789', nome: 'Leaf', parent_id: '456' })
      ];
      
      mockRepository.findCategoryPath.mockResolvedValue(expectedPath);
      
      // Act
      const result = await service.findCategoryPath(categoryId);
      
      // Assert
      expect(mockRepository.findCategoryPath).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(expectedPath);
    });
  });
  
  describe('createCategoria', () => {
    it('should create a categoria successfully', async () => {
      // Arrange
      const categoriaData = {
        nome: 'New Categoria',
        descricao: 'Description'
      };
      const expectedResult = {
        id: '123',
        nome: 'New Categoria',
        descricao: 'Description',
        parent_id: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createCategoria(categoriaData);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(categoriaData);
      expect(result).toEqual(expectedResult);
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const categoriaData = {
        descricao: 'Description'
      };
      
      // Act & Assert
      await expect(service.createCategoria(categoriaData)).rejects.toThrow('Nome is required');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should validate parent exists', async () => {
      // Arrange
      const categoriaData = {
        nome: 'New Categoria',
        descricao: 'Description',
        parent_id: '999'
      };
      
      mockRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.createCategoria(categoriaData)).rejects.toThrow('Parent category does not exist');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should create a subcategory successfully', async () => {
      // Arrange
      const parentId = '456';
      const categoriaData = {
        nome: 'New Subcategoria',
        descricao: 'Description',
        parent_id: parentId
      };
      const expectedResult = {
        id: '123',
        nome: 'New Subcategoria',
        descricao: 'Description',
        parent_id: parentId,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      
      mockRepository.findById.mockResolvedValue(createMockCategoria({ id: parentId }));
      mockRepository.create.mockResolvedValue(expectedResult);
      
      // Act
      const result = await service.createCategoria(categoriaData);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(parentId);
      expect(mockRepository.create).toHaveBeenCalledWith(categoriaData);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('wouldCreateCircularReference', () => {
    it('should detect direct circular reference', async () => {
      // Arrange
      const categoryId = '123';
      const newParentId = '123';
      
      // Act
      const result = await (service as any).wouldCreateCircularReference(categoryId, newParentId);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should detect indirect circular reference', async () => {
      // Arrange
      const categoryId = '123';
      const childId = '456';
      const grandchildId = '789';
      
      // Mock findById to simulate a hierarchy
      mockRepository.findById
        .mockResolvedValueOnce({ id: grandchildId, parent_id: childId }) // First call for grandchild
        .mockResolvedValueOnce({ id: childId, parent_id: categoryId }); // Second call for child
      
      // Act
      const result = await (service as any).wouldCreateCircularReference(categoryId, grandchildId);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false for valid parent change', async () => {
      // Arrange
      const categoryId = '123';
      const newParentId = '456';
      
      // Mock findById to simulate a hierarchy
      mockRepository.findById.mockResolvedValueOnce({ id: newParentId, parent_id: '789' });
      
      // Act
      const result = await (service as any).wouldCreateCircularReference(categoryId, newParentId);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should handle cycles in the existing hierarchy', async () => {
      // Arrange
      const categoryId = '123';
      const newParentId = '456';
      
      // Mock findById to simulate a cycle in the existing hierarchy
      mockRepository.findById
        .mockResolvedValueOnce({ id: newParentId, parent_id: '789' })
        .mockResolvedValueOnce({ id: '789', parent_id: '456' }); // This creates a cycle
      
      // Act
      const result = await (service as any).wouldCreateCircularReference(categoryId, newParentId);
      
      // Assert
      expect(result).toBe(true);
    });
  });
});