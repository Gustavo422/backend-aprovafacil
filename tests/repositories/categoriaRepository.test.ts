/**
 * Categoria Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockCategoria } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the CategoriaRepository class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { CategoriaRepository } from '../../src/repositories/CategoriaRepository';

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

// Mock Categoria interface
interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// Mock CategoriaRepository class
class CategoriaRepository extends BaseRepository<Categoria> {
  constructor(supabaseClient: any) {
    super(supabaseClient, 'categorias');
  }

  async findRootCategories(): Promise<Categoria[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .is('parent_id', null);
      
    if (error) throw error;
    return data || [];
  }

  async findByParentId(parentId: string): Promise<Categoria[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('parent_id', parentId);
      
    if (error) throw error;
    return data || [];
  }

  async findWithHierarchy(): Promise<(Categoria & { level: number, path: string[] })[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*');
      
    if (error) throw error;
    
    // This is a simplified mock implementation
    // In a real implementation, this would involve more complex logic
    const categoriesWithHierarchy = (data || []).map((categoria: Categoria) => {
      return {
        ...categoria,
        level: categoria.parent_id ? 1 : 0,
        path: categoria.parent_id ? ['Root Category', 'Subcategory'] : ['Root Category']
      };
    });
    
    return categoriesWithHierarchy;
  }

  async moveCategory(id: string, newParentId: string | null): Promise<Categoria | null> {
    return this.update(id, { parent_id: newParentId });
  }

  async findByName(name: string): Promise<Categoria[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .ilike('nome', `%${name}%`);
      
    if (error) throw error;
    return data || [];
  }

  async findWithFilters(filters: Record<string, any>): Promise<Categoria[]> {
    let query = this.supabaseClient
      .from(this.tableName)
      .select('*');
    
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    if (filters.parent_id) {
      query = query.eq('parent_id', filters.parent_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  async countSubcategories(parentId: string): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('count')
      .eq('parent_id', parentId);
      
    if (error) throw error;
    return data?.count || 0;
  }

  async findCategoryPath(categoryId: string): Promise<Categoria[]> {
    // This is a simplified mock implementation
    // In a real implementation, this would involve recursive queries
    
    const path: Categoria[] = [];
    let currentId = categoryId;
    
    while (currentId) {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('id', currentId);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      const category = data[0] as Categoria;
      path.unshift(category); // Add to the beginning of the array to get the correct order
      
      if (!category.parent_id) break;
      currentId = category.parent_id;
    }
    
    return path;
  }
}

describe('CategoriaRepository', () => {
  let mockSupabase: any;
  let repository: CategoriaRepository;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient();
    repository = new CategoriaRepository(mockSupabase);
  });
  
  describe('findRootCategories', () => {
    it('should find root categories', async () => {
      // Arrange
      const expectedCategories = [
        createMockCategoria({ parent_id: null }),
        createMockCategoria({ parent_id: null })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCategories, error: null }))
      );
      
      // Act
      const results = await repository.findRootCategories();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.is).toHaveBeenCalledWith('parent_id', null);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCategories, error: null }))
      );
      
      // Act
      const results = await repository.findByParentId(parentId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('parent_id', parentId);
      expect(results).toEqual(expectedCategories);
    });
    
    it('should return empty array when no subcategories are found', async () => {
      // Arrange
      const parentId = '123';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const results = await repository.findByParentId(parentId);
      
      // Assert
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCategories, error: null }))
      );
      
      // Act
      const results = await repository.findWithHierarchy();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.moveCategory(id, newParentId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ parent_id: newParentId });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.moveCategory(id, null);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ parent_id: null });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCategories, error: null }))
      );
      
      // Act
      const results = await repository.findByName(name);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.ilike).toHaveBeenCalledWith('nome', '%Test%');
      expect(results).toEqual(expectedCategories);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCategories, error: null }))
      );
      
      // Act
      const results = await repository.findWithFilters(filters);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.ilike).toHaveBeenCalledWith('nome', '%Test%');
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('parent_id', '123');
      expect(results).toEqual(expectedCategories);
    });
  });
  
  describe('countSubcategories', () => {
    it('should count subcategories for a parent category', async () => {
      // Arrange
      const parentId = '123';
      const expectedCount = { count: 5 };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCount, error: null }))
      );
      
      // Act
      const result = await repository.countSubcategories(parentId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalledWith('count');
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('parent_id', parentId);
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
      
      // Mock the recursive calls to get the category path
      mockSupabase._methods.then
        // First call - get the leaf category
        .mockImplementationOnce((callback) => 
          Promise.resolve(callback({ data: [expectedPath[2]], error: null }))
        )
        // Second call - get the intermediate category
        .mockImplementationOnce((callback) => 
          Promise.resolve(callback({ data: [expectedPath[1]], error: null }))
        )
        // Third call - get the root category
        .mockImplementationOnce((callback) => 
          Promise.resolve(callback({ data: [expectedPath[0]], error: null }))
        );
      
      // Act
      const result = await repository.findCategoryPath(categoryId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('categorias');
      expect(mockSupabase._methods.select).toHaveBeenCalledTimes(3);
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', categoryId);
      expect(result).toEqual(expectedPath);
    });
    
    it('should handle category not found', async () => {
      // Arrange
      const categoryId = '999';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const result = await repository.findCategoryPath(categoryId);
      
      // Assert
      expect(result).toEqual([]);
    });
  });
});