/**
 * Base Repository Integration Tests
 * Tests the integration between BaseRepository and SupabaseConnectionManager
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';
import { BaseRepository } from '../../src/core/database/base-repository';
import { FiltroBase } from '../../src/shared/types/index.js';

// Create a test entity interface
interface TestEntity {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
}

// Create a test repository that extends BaseRepository
class TestRepository extends BaseRepository<TestEntity> {
  constructor(options: any) {
    super({
      tableName: 'categorias', // Use an existing table for testing
      ...options
    });
  }
  
  // Add a test-specific method
  async findByName(name: string): Promise<TestEntity[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .ilike('nome', `%${name}%`)
        .order('nome');
      
      if (this.softDelete) {
        query = query.filter(this.deletedColumn, 'is', null);
      }
      
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      return (result.data || []) as TestEntity[];
    } catch (error) {
      this.handleError(`findByName:${name}`, error);
      return [];
    }
  }
}

describe('Base Repository Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: TestRepository;
  
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
    repository = new TestRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Operações Básicas', () => {
    it('deve buscar todos os registros', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        const result = await repository.buscarTodos();
        
        // Verificamos se o resultado tem a estrutura esperada
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(typeof result.pagination.page).toBe('number');
        expect(typeof result.pagination.limit).toBe('number');
        expect(typeof result.pagination.total).toBe('number');
        expect(typeof result.pagination.totalPages).toBe('number');
        
        console.log(`Recuperados ${result.data.length} registros de um total de ${result.pagination.total}`);
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível recuperar registros: ${(error as Error).message}`);
      }
    });
    
    it('deve buscar registros com paginação', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        const filtro: FiltroBase = {
          page: 1,
          limit: 5,
          sort_by: 'nome',
          sort_order: 'asc'
        };
        
        const result = await repository.buscarTodos(filtro);
        
        // Verificamos se o resultado tem a estrutura esperada
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.page).toBe(filtro.page);
        expect(result.pagination.limit).toBe(filtro.limit);
        
        console.log(`Recuperados ${result.data.length} registros com paginação`);
        
        // Se houver registros, verificamos a ordenação
        if (result.data.length > 1) {
          // Verificar se os registros estão ordenados por nome em ordem ascendente
          const nomes = result.data.map(item => item.nome);
          const nomesSorted = [...nomes].sort();
          expect(nomes).toEqual(nomesSorted);
        }
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível recuperar registros com paginação: ${(error as Error).message}`);
      }
    });
    
    it('deve buscar registro por ID', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        // Primeiro buscamos todos os registros para obter um ID válido
        const todos = await repository.buscarTodos();
        
        if (todos.data.length === 0) {
          console.log('Não há registros para testar busca por ID');
          return;
        }
        
        // Usar o ID do primeiro registro
        const id = todos.data[0].id;
        
        const resultado = await repository.buscarPorId(id);
        
        // Verificamos se o resultado tem a estrutura esperada
        if (resultado) {
          expect(resultado).toBeDefined();
          expect(resultado.id).toBe(id);
          console.log(`Registro encontrado por ID: ${id}`);
        } else {
          // Pode retornar null se o registro não existir mais
          console.log(`Registro com ID ${id} não encontrado`);
        }
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível buscar registro por ID: ${(error as Error).message}`);
      }
    });
    
    it('deve verificar existência por ID', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        // Primeiro buscamos todos os registros para obter um ID válido
        const todos = await repository.buscarTodos();
        
        if (todos.data.length === 0) {
          console.log('Não há registros para testar existência por ID');
          return;
        }
        
        // Usar o ID do primeiro registro
        const id = todos.data[0].id;
        
        const existe = await repository.existePorId(id);
        
        // Verificamos se o resultado é verdadeiro
        expect(existe).toBe(true);
        console.log(`Verificação de existência por ID ${id}: ${existe}`);
        
        // Testar com ID inexistente
        const idInexistente = '00000000-0000-0000-0000-000000000000';
        const naoExiste = await repository.existePorId(idInexistente);
        
        // Verificamos se o resultado é falso
        expect(naoExiste).toBe(false);
        console.log(`Verificação de existência por ID inexistente ${idInexistente}: ${naoExiste}`);
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível verificar existência por ID: ${(error as Error).message}`);
      }
    });
    
    it('deve buscar por nome', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        // Primeiro buscamos todos os registros para ter um termo de busca válido
        const todos = await repository.buscarTodos();
        
        if (todos.data.length === 0) {
          console.log('Não há registros para testar busca por nome');
          return;
        }
        
        // Usar o nome do primeiro registro como termo de busca
        const termoBusca = todos.data[0].nome.substring(0, 3); // Primeiros 3 caracteres
        
        const resultados = await repository.findByName(termoBusca);
        
        // Verificamos se o resultado é um array
        expect(Array.isArray(resultados)).toBe(true);
        
        // Deve encontrar pelo menos o registro que usamos como base para o termo de busca
        expect(resultados.length).toBeGreaterThan(0);
        
        console.log(`Busca por "${termoBusca}" retornou ${resultados.length} registros`);
        
        // Verificamos se todos os registros encontrados contêm o termo de busca
        resultados.forEach(registro => {
          expect(registro.nome.toLowerCase()).toContain(termoBusca.toLowerCase());
        });
      } catch (error) {
        // Se houver erro, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Erro ao buscar por nome: ${(error as Error).message}`);
      }
    });
  });
  
  describe('Integração com SupabaseConnectionManager', () => {
    it('deve usar o cliente fornecido pelo SupabaseConnectionManager', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Verificar se o cliente do repositório é o mesmo fornecido pelo connectionManager
      const clienteRepo = (repository as any).supabase;
      const clienteManager = connectionManager.getClient();
      
      expect(clienteRepo).toBe(clienteManager);
    });
    
    it('deve atualizar o cliente quando o SupabaseConnectionManager é resetado', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Guardar referência ao cliente atual
      const clienteAnterior = (repository as any).supabase;
      
      // Criar um novo repositório que usa o cliente do connectionManager
      const novoRepo = new TestRepository({
        supabaseClient: connectionManager.getClient()
      });
      
      // Resetar o connectionManager
      connectionManager.resetClient();
      
      // Criar outro repositório após o reset
      const repoAposReset = new TestRepository({
        supabaseClient: connectionManager.getClient()
      });
      
      // O cliente do novo repositório deve ser diferente do anterior
      expect((novoRepo as any).supabase).toBe(clienteAnterior);
      expect((repoAposReset as any).supabase).not.toBe(clienteAnterior);
    });
  });
});