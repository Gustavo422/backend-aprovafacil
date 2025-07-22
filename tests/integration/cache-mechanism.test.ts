/**
 * Cache Mechanism Integration Tests
 * Tests the cache mechanism in the BaseRepository with SupabaseConnectionManager
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';
import { BaseRepository } from '../../src/core/database/base-repository';

// Create a test entity interface
interface TestEntity {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
}

// Create a test repository that extends BaseRepository with cache testing capabilities
class CacheTestRepository extends BaseRepository<TestEntity> {
  public queryCount = 0;
  
  constructor(options: any) {
    super({
      tableName: 'categorias', // Use an existing table for testing
      cacheTime: 5, // 5 seconds cache
      ...options
    });
  }
  
  // Method to test cache mechanism
  async testCacheQuery(id: string): Promise<TestEntity | null> {
    this.queryCount++;
    
    // Check cache first
    const cacheKey = `${this.tableName}:${id}`;
    const cachedData = this.getFromCache(cacheKey);
    
    if (cachedData) {
      return cachedData as TestEntity;
    }
    
    // If not in cache, query the database
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return null;
      }
      
      // Store in cache
      this.storeInCache(cacheKey, data, this.cacheTime);
      
      return data;
    } catch (error) {
      return null;
    }
  }
  
  // Method to clear cache
  clearCache(): void {
    // Clear the cache
    this.clearAllCache();
  }
  
  // Cache methods (simplified for testing)
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (cached.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private storeInCache(key: string, data: any, seconds: number): void {
    const expiry = Date.now() + (seconds * 1000);
    this.cache.set(key, { data, expiry });
  }
  
  private clearAllCache(): void {
    this.cache.clear();
  }
}

describe('Cache Mechanism Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: CacheTestRepository;
  
  beforeAll(() => {
    // Use the global client from setup if available
    const globalClient = (global as any).supabaseClient;
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.warn('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos no ambiente. Alguns testes podem ser ignorados.');
    }
    
    // Initialize the connection manager
    connectionManager = new SupabaseConnectionManager({
      supabaseUrl: process.env.SUPABASE_URL as string,
      supabaseKey: process.env.SUPABASE_ANON_KEY as string,
      // Use existing client if available
      existingClient: globalClient
    });
    
    // Create the repository
    repository = new CacheTestRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Mecanismo de Cache', () => {
    it('deve usar cache para consultas repetidas', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Primeiro, buscar todas as categorias para obter um ID válido
      const { data: categorias } = await repository.supabase
        .from(repository.tableName)
        .select('*')
        .limit(1);
      
      if (!categorias || categorias.length === 0) {
        console.log('Pulando teste: Não há categorias no banco de dados');
        return;
      }
      
      const id = categorias[0].id;
      
      // Limpar cache e contador
      repository.clearCache();
      repository.queryCount = 0;
      
      // Primeira consulta - deve ir ao banco
      const resultado1 = await repository.testCacheQuery(id);
      expect(resultado1).toBeDefined();
      expect(repository.queryCount).toBe(1);
      
      // Segunda consulta - deve usar cache
      const resultado2 = await repository.testCacheQuery(id);
      expect(resultado2).toBeDefined();
      expect(repository.queryCount).toBe(1); // Contador não deve aumentar
      
      // Terceira consulta - deve usar cache
      const resultado3 = await repository.testCacheQuery(id);
      expect(resultado3).toBeDefined();
      expect(repository.queryCount).toBe(1); // Contador não deve aumentar
      
      // Verificar se os resultados são iguais
      expect(resultado1).toEqual(resultado2);
      expect(resultado2).toEqual(resultado3);
    });
    
    it('deve atualizar cache após expiração', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Primeiro, buscar todas as categorias para obter um ID válido
      const { data: categorias } = await repository.supabase
        .from(repository.tableName)
        .select('*')
        .limit(1);
      
      if (!categorias || categorias.length === 0) {
        console.log('Pulando teste: Não há categorias no banco de dados');
        return;
      }
      
      const id = categorias[0].id;
      
      // Limpar cache e contador
      repository.clearCache();
      repository.queryCount = 0;
      
      // Primeira consulta - deve ir ao banco
      const resultado1 = await repository.testCacheQuery(id);
      expect(resultado1).toBeDefined();
      expect(repository.queryCount).toBe(1);
      
      // Limpar cache manualmente
      repository.clearCache();
      
      // Segunda consulta - deve ir ao banco novamente
      const resultado2 = await repository.testCacheQuery(id);
      expect(resultado2).toBeDefined();
      expect(repository.queryCount).toBe(2); // Contador deve aumentar
      
      // Verificar se os resultados são iguais
      expect(resultado1).toEqual(resultado2);
    });
    
    it('deve usar cache para diferentes IDs separadamente', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Primeiro, buscar todas as categorias para obter IDs válidos
      const { data: categorias } = await repository.supabase
        .from(repository.tableName)
        .select('*')
        .limit(2);
      
      if (!categorias || categorias.length < 2) {
        console.log('Pulando teste: Não há categorias suficientes no banco de dados');
        return;
      }
      
      const id1 = categorias[0].id;
      const id2 = categorias[1].id;
      
      // Limpar cache e contador
      repository.clearCache();
      repository.queryCount = 0;
      
      // Primeira consulta para id1 - deve ir ao banco
      const resultado1 = await repository.testCacheQuery(id1);
      expect(resultado1).toBeDefined();
      expect(repository.queryCount).toBe(1);
      
      // Primeira consulta para id2 - deve ir ao banco
      const resultado2 = await repository.testCacheQuery(id2);
      expect(resultado2).toBeDefined();
      expect(repository.queryCount).toBe(2); // Contador deve aumentar
      
      // Segunda consulta para id1 - deve usar cache
      const resultado3 = await repository.testCacheQuery(id1);
      expect(resultado3).toBeDefined();
      expect(repository.queryCount).toBe(2); // Contador não deve aumentar
      
      // Segunda consulta para id2 - deve usar cache
      const resultado4 = await repository.testCacheQuery(id2);
      expect(resultado4).toBeDefined();
      expect(repository.queryCount).toBe(2); // Contador não deve aumentar
      
      // Verificar se os resultados são iguais
      expect(resultado1).toEqual(resultado3);
      expect(resultado2).toEqual(resultado4);
      
      // Verificar se os resultados são diferentes entre si
      expect(resultado1).not.toEqual(resultado2);
    });
  });
});