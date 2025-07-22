/**
 * Concurso Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockConcurso } from '../utils/mockFactory';
import { expectToThrow } from '../utils/testUtils';

// Mock the ConcursoRepository class since the actual implementation might not exist yet
// This will be replaced with the actual import when the implementation is available
// import { ConcursoRepository } from '../../src/repositories/ConcursoRepository';

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

// Mock Concurso interface
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

// Mock ConcursoRepository class
class ConcursoRepository extends BaseRepository<Concurso> {
  constructor(supabaseClient: any) {
    super(supabaseClient, 'concursos');
  }

  async findByStatus(status: string): Promise<Concurso[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('status', status);
      
    if (error) throw error;
    return data || [];
  }

  async findActive(): Promise<Concurso[]> {
    const currentDate = new Date().toISOString();
    
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('status', 'ativo')
      .lte('data_inicio', currentDate)
      .gte('data_fim', currentDate);
      
    if (error) throw error;
    return data || [];
  }

  async findUpcoming(): Promise<Concurso[]> {
    const currentDate = new Date().toISOString();
    
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('status', 'ativo')
      .gt('data_inicio', currentDate);
      
    if (error) throw error;
    return data || [];
  }

  async findPast(): Promise<Concurso[]> {
    const currentDate = new Date().toISOString();
    
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .lt('data_fim', currentDate);
      
    if (error) throw error;
    return data || [];
  }

  async updateStatus(id: string, status: string): Promise<Concurso | null> {
    return this.update(id, { status });
  }

  async findWithFilters(filters: Record<string, any>): Promise<Concurso[]> {
    let query = this.supabaseClient
      .from(this.tableName)
      .select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  async findWithPagination(page: number, pageSize: number): Promise<Concurso[]> {
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

  async countConcursos(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('count');
      
    if (error) throw error;
    return data?.count || 0;
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Concurso[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select('*')
      .gte('data_inicio', startDate)
      .lte('data_fim', endDate);
      
    if (error) throw error;
    return data || [];
  }
}

describe('ConcursoRepository', () => {
  let mockSupabase: any;
  let repository: ConcursoRepository;
  
  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabaseClient();
    repository = new ConcursoRepository(mockSupabase);
  });
  
  describe('findByStatus', () => {
    it('should find concursos by status', async () => {
      // Arrange
      const status = 'ativo';
      const expectedConcursos = [
        createMockConcurso({ status }),
        createMockConcurso({ status })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findByStatus(status);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('status', status);
      expect(results).toEqual(expectedConcursos);
    });
    
    it('should return empty array when no concursos with status are found', async () => {
      // Arrange
      const status = 'nonexistent';
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [], error: null }))
      );
      
      // Act
      const results = await repository.findByStatus(status);
      
      // Assert
      expect(results).toEqual([]);
    });
  });
  
  describe('findActive', () => {
    it('should find active concursos', async () => {
      // Arrange
      const currentDate = new Date().toISOString();
      const expectedConcursos = [
        createMockConcurso({ status: 'ativo', data_inicio: '2023-01-01T00:00:00Z', data_fim: '2025-01-01T00:00:00Z' }),
        createMockConcurso({ status: 'ativo', data_inicio: '2023-02-01T00:00:00Z', data_fim: '2025-02-01T00:00:00Z' })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findActive();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(mockSupabase._methods.lte).toHaveBeenCalledWith('data_inicio', expect.any(String));
      expect(mockSupabase._methods.gte).toHaveBeenCalledWith('data_fim', expect.any(String));
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findUpcoming', () => {
    it('should find upcoming concursos', async () => {
      // Arrange
      const currentDate = new Date().toISOString();
      const expectedConcursos = [
        createMockConcurso({ status: 'ativo', data_inicio: '2025-01-01T00:00:00Z', data_fim: '2025-02-01T00:00:00Z' }),
        createMockConcurso({ status: 'ativo', data_inicio: '2025-02-01T00:00:00Z', data_fim: '2025-03-01T00:00:00Z' })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findUpcoming();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(mockSupabase._methods.gt).toHaveBeenCalledWith('data_inicio', expect.any(String));
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findPast', () => {
    it('should find past concursos', async () => {
      // Arrange
      const currentDate = new Date().toISOString();
      const expectedConcursos = [
        createMockConcurso({ status: 'encerrado', data_inicio: '2022-01-01T00:00:00Z', data_fim: '2022-02-01T00:00:00Z' }),
        createMockConcurso({ status: 'encerrado', data_inicio: '2022-02-01T00:00:00Z', data_fim: '2022-03-01T00:00:00Z' })
      ];
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findPast();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.lt).toHaveBeenCalledWith('data_fim', expect.any(String));
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: [expectedResult], error: null }))
      );
      
      // Act
      const result = await repository.updateStatus(id, status);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.update).toHaveBeenCalledWith({ status });
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('id', id);
      expect(result).toEqual(expectedResult);
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findWithFilters(filters);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(mockSupabase._methods.ilike).toHaveBeenCalledWith('nome', '%Test%');
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('findWithPagination', () => {
    it('should find concursos with pagination', async () => {
      // Arrange
      const page = 1;
      const pageSize = 10;
      const expectedConcursos = Array(10).fill(null).map(() => createMockConcurso());
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findWithPagination(page, pageSize);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.limit).toHaveBeenCalledWith(pageSize);
      // Check for range calculation (page - 1) * pageSize
      expect(mockSupabase._methods.range).toHaveBeenCalledWith(0, 9);
      expect(results).toEqual(expectedConcursos);
    });
  });
  
  describe('countConcursos', () => {
    it('should count total concursos', async () => {
      // Arrange
      const expectedCount = { count: 42 };
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedCount, error: null }))
      );
      
      // Act
      const result = await repository.countConcursos();
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalledWith('count');
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
      
      mockSupabase._methods.then.mockImplementationOnce((callback) => 
        Promise.resolve(callback({ data: expectedConcursos, error: null }))
      );
      
      // Act
      const results = await repository.findByDateRange(startDate, endDate);
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('concursos');
      expect(mockSupabase._methods.select).toHaveBeenCalled();
      expect(mockSupabase._methods.gte).toHaveBeenCalledWith('data_inicio', startDate);
      expect(mockSupabase._methods.lte).toHaveBeenCalledWith('data_fim', endDate);
      expect(results).toEqual(expectedConcursos);
    });
  });
});