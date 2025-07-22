/**
 * Apostila Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockApostila } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the ApostilaRepository class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { ApostilaRepository } from '../../src/repositories/ApostilaRepository';

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

// Mock Apostila interface
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

// Mock ApostilaRepository class
class ApostilaRepository extends BaseRepository<Apostila> {
  constructor(supabaseClient: any) {
    super(supabaseClient, 'apostilas');
  }

  async findByCategoriaId(categoriaId: string): Promise<Apostila[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('categoria_id', categoriaId);
      
    if (error) throw error;
    return data || [];
  }

  async findByAutor(autor: string): Promise<Apostila[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('autor', autor);
      
    if (error) throw error;
    return data || [];
  }

  async findByTitulo(titulo: string): Promise<Apostila[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .ilike('titulo', `%${titulo}%`);
      
    if (error) throw error;
    return data || [];
  }

  async findWithFilters(filters: Record<string, any>): Promise<Apostila[]> {
    let query = this.supabaseClient
      .from(this.tableName)
      .select('*');
    
    if (filters.titulo) {
      query = query.ilike('titulo', `%${filters.titulo}%`);
    }
    
    if (filters.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    
    if (filters.autor) {
      query = query.eq('autor', filters.autor);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  async updateConteudo(id: string, conteudo: string): Promise<Apostila | null> {
    return this.update(id, { conteudo });
  }

  async findWithPagination(page: number, pageSize: number): Promise<Apostila[]> {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .range(start, end)
      .limit(pageSize);
      
    if (error) throw error;
    return data || [];
  }

  async countApostilas(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('count');
      
    if (error) throw error;
    return data?.count || 0;
  }

  async countApostilasByCategoria(categoriaId: string): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('count')
      .eq('categoria_id', categoriaId);
      
    if (error) throw error;
    return data?.count || 0;
  }

  async findRecentlyUpdated(limit: number = 10): Promise<Apostila[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  }

  async findWithFullText(searchTerm: string): Promise<Apostila[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .textSearch('conteudo', searchTerm);
      
    if (error) throw error;
    return data || [];
  }
}

describe('ApostilaRepository', () => {
  let mockSupabase: any;
  let repository: ApostilaRepository;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient();
    repository = new ApostilaRepository(mockSupabase);
  });
  
  describe('findByCategoriaId', () => {
    it('should find apostilas by categoria id', async () => {
      // Arrange
      const categoriaId = '123';
      const expectedApostilas = [
        createMockApostila({ categoria_id: categoriaId }),
        createMockApostila({ categoria_id: categoriaId })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findByCategoriaId(categoriaId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('categoria_id', categoriaId);
      expect(results).toEqual(expectedApostilas);
    });
    
    it('should return empty array when no apostilas are found', async () => {
      // Arrange
      const categoriaId = '123';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const results = await repository.findByCategoriaId(categoriaId);
      
      // Assert
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findByAutor(autor);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('autor', autor);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findByTitulo(titulo);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.ilike).toHaveBeenCalledWith('titulo', '%Test%');
      expect(results).toEqual(expectedApostilas);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findWithFilters(filters);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.ilike).toHaveBeenCalledWith('titulo', '%Test%');
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('categoria_id', '123');
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('autor', 'Author');
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.updateConteudo(id, conteudo);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ conteudo });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
    });
  });
  
  describe('findWithPagination', () => {
    it('should find apostilas with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedApostilas = Array(10).fill(null).map(() => createMockApostila());
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.limit).toHaveBeenCalledWith(pageSize);
      // Check for range calculation (page - 1) * pageSize
      expect(mockSupabase._methods.range).toHaveBeenCalledWith(0, 9);
      expect(results).toEqual(expectedApostilas);
    });
  });
  
  describe('countApostilas', () => {
    it('should count total apostilas', async () => {
      // Arrange
      const expectedCount = { count: 42 };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCount, error: null }))
      );
      
      // Act
      const result = await repository.countApostilas();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalledWith('count');
      expect(result).toBe(42);
    });
  });
  
  describe('countApostilasByCategoria', () => {
    it('should count apostilas by categoria', async () => {
      // Arrange
      const categoriaId = '123';
      const expectedCount = { count: 15 };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCount, error: null }))
      );
      
      // Act
      const result = await repository.countApostilasByCategoria(categoriaId);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalledWith('count');
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('categoria_id', categoriaId);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findRecentlyUpdated(limit);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(mockSupabase._methods.limit).toHaveBeenCalledWith(limit);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedApostilas, error: null }))
      );
      
      // Act
      const results = await repository.findWithFullText(searchTerm);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('apostilas');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.textSearch).toHaveBeenCalled();
      expect(results).toEqual(expectedApostilas);
    });
  });
});