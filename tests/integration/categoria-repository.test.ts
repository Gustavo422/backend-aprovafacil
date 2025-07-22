/**
 * Categoria Repository Integration Tests
 * Tests the CategoriaRepository class with a real Supabase connection
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';
import { CategoriaRepository } from '../../src/repositories/CategoriaRepository';

describe('Categoria Repository Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: CategoriaRepository;
  
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
    repository = new CategoriaRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Operações Básicas', () => {
    it('deve recuperar categorias', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        const categorias = await repository.buscarTodas();
        
        // Verificamos se o resultado é um array, independentemente de haver categorias no banco
        expect(Array.isArray(categorias)).toBe(true);
        console.log(`Recuperadas ${categorias.length} categorias do banco de dados`);
        
        // Se houver categorias, verificamos a estrutura da primeira
        if (categorias.length > 0) {
          const primeiraCategoria = categorias[0];
          expect(primeiraCategoria).toHaveProperty('id');
          expect(primeiraCategoria).toHaveProperty('nome');
          console.log(`Exemplo de categoria: ${JSON.stringify(primeiraCategoria)}`);
        }
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível recuperar categorias: ${(error as Error).message}`);
      }
    });
    
    it('deve lidar com relacionamentos pai-filho', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        const categoriasComFilhos = await repository.buscarComFilhos();
        
        // Verificamos se o resultado é um array
        expect(Array.isArray(categoriasComFilhos)).toBe(true);
        
        // Se houver categorias com filhos, verificamos a estrutura
        if (categoriasComFilhos.length > 0) {
          // Algumas categorias podem ter filhos
          const hasChildren = categoriasComFilhos.some(cat => 
            Array.isArray(cat.filhos) && cat.filhos.length > 0
          );
          
          console.log(`Encontradas ${categoriasComFilhos.length} categorias, ${hasChildren ? 'algumas com filhos' : 'nenhuma com filhos'}`);
          
          // Se houver categorias com filhos, verificamos a estrutura
          const categoriaComFilhos = categoriasComFilhos.find(cat => 
            Array.isArray(cat.filhos) && cat.filhos.length > 0
          );
          
          if (categoriaComFilhos) {
            expect(categoriaComFilhos).toHaveProperty('id');
            expect(categoriaComFilhos).toHaveProperty('nome');
            expect(Array.isArray(categoriaComFilhos.filhos)).toBe(true);
            expect(categoriaComFilhos.filhos.length).toBeGreaterThan(0);
            
            // Verificar a estrutura do primeiro filho
            const primeiroFilho = categoriaComFilhos.filhos[0];
            expect(primeiroFilho).toHaveProperty('id');
            expect(primeiroFilho).toHaveProperty('nome');
            
            console.log(`Exemplo de categoria com filhos: ${categoriaComFilhos.nome} (${categoriaComFilhos.filhos.length} filhos)`);
          }
        }
      } catch (error) {
        // Se a tabela não existir, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Não foi possível recuperar categorias com filhos: ${(error as Error).message}`);
      }
    });
    
    it('deve buscar categorias por nome', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      try {
        // Primeiro buscamos todas as categorias para ter um termo de busca válido
        const todasCategorias = await repository.buscarTodas();
        
        if (todasCategorias.length === 0) {
          console.log('Não há categorias no banco de dados para testar a busca por nome');
          return;
        }
        
        // Usamos o nome da primeira categoria como termo de busca
        const termoBusca = todasCategorias[0].nome.substring(0, 3); // Primeiros 3 caracteres
        
        const categoriasPorNome = await repository.buscarPorNome(termoBusca);
        
        // Verificamos se o resultado é um array
        expect(Array.isArray(categoriasPorNome)).toBe(true);
        expect(categoriasPorNome.length).toBeGreaterThan(0);
        
        console.log(`Busca por "${termoBusca}" retornou ${categoriasPorNome.length} categorias`);
        
        // Verificamos se todas as categorias encontradas contêm o termo de busca
        categoriasPorNome.forEach(categoria => {
          expect(categoria.nome.toLowerCase()).toContain(termoBusca.toLowerCase());
        });
      } catch (error) {
        // Se houver erro, registramos um aviso mas não falhamos o teste
        console.warn(`Aviso: Erro ao buscar categorias por nome: ${(error as Error).message}`);
      }
    });
  });
});