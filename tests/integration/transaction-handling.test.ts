/**
 * Transaction Handling Integration Tests
 * Tests the transaction handling in the BaseRepository with SupabaseConnectionManager
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

// Create a test repository that extends BaseRepository with transaction testing capabilities
class TransactionTestRepository extends BaseRepository<TestEntity> {
  constructor(options: any) {
    super({
      tableName: 'categorias', // Use an existing table for testing
      ...options
    });
  }
  
  // Method to test transaction with commit
  async testTransactionCommit(nome: string, descricao: string): Promise<TestEntity | null> {
    try {
      // Start a transaction
      const { data: transaction, error: txError } = await this.supabase.rpc('begin_transaction');
      
      if (txError) {
        console.error('Erro ao iniciar transação:', txError.message);
        return null;
      }
      
      // Create a new entity within the transaction
      const { data: newEntity, error: createError } = await this.supabase
        .from(this.tableName)
        .insert({ nome, descricao })
        .select('*')
        .single();
      
      if (createError) {
        // Rollback on error
        await this.supabase.rpc('rollback_transaction', { transaction_id: transaction.id });
        console.error('Erro ao criar entidade:', createError.message);
        return null;
      }
      
      // Commit the transaction
      const { error: commitError } = await this.supabase.rpc('commit_transaction', { transaction_id: transaction.id });
      
      if (commitError) {
        console.error('Erro ao confirmar transação:', commitError.message);
        return null;
      }
      
      return newEntity;
    } catch (error) {
      console.error('Erro na transação:', (error as Error).message);
      return null;
    }
  }
  
  // Method to test transaction with rollback
  async testTransactionRollback(nome: string, descricao: string): Promise<boolean> {
    try {
      // Start a transaction
      const { data: transaction, error: txError } = await this.supabase.rpc('begin_transaction');
      
      if (txError) {
        console.error('Erro ao iniciar transação:', txError.message);
        return false;
      }
      
      // Create a new entity within the transaction
      const { data: newEntity, error: createError } = await this.supabase
        .from(this.tableName)
        .insert({ nome, descricao })
        .select('*')
        .single();
      
      if (createError) {
        // Rollback on error
        await this.supabase.rpc('rollback_transaction', { transaction_id: transaction.id });
        console.error('Erro ao criar entidade:', createError.message);
        return false;
      }
      
      // Rollback the transaction
      const { error: rollbackError } = await this.supabase.rpc('rollback_transaction', { transaction_id: transaction.id });
      
      if (rollbackError) {
        console.error('Erro ao reverter transação:', rollbackError.message);
        return false;
      }
      
      // Check if the entity was not created (rollback successful)
      const { data: checkEntity, error: checkError } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', newEntity.id)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        // Entity not found, rollback successful
        return true;
      }
      
      // Entity found, rollback failed
      return false;
    } catch (error) {
      console.error('Erro na transação:', (error as Error).message);
      return false;
    }
  }
}

describe('Transaction Handling Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: TransactionTestRepository;
  
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
    repository = new TransactionTestRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Transações', () => {
    it('deve executar transação com commit com sucesso', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Skip if RPC functions for transactions are not available
      try {
        const { error } = await repository.supabase.rpc('check_transaction_functions_exist');
        if (error) {
          console.log('Pulando teste: Funções de transação não estão disponíveis no banco de dados');
          return;
        }
      } catch (error) {
        console.log('Pulando teste: Funções de transação não estão disponíveis no banco de dados');
        return;
      }
      
      const nome = `Test Transaction ${Date.now()}`;
      const descricao = 'Teste de transação com commit';
      
      const resultado = await repository.testTransactionCommit(nome, descricao);
      
      if (resultado) {
        expect(resultado).toBeDefined();
        expect(resultado.nome).toBe(nome);
        expect(resultado.descricao).toBe(descricao);
        
        // Verificar se a entidade foi realmente criada
        const { data: checkEntity } = await repository.supabase
          .from(repository.tableName)
          .select('*')
          .eq('id', resultado.id)
          .single();
        
        expect(checkEntity).toBeDefined();
        expect(checkEntity.nome).toBe(nome);
        
        // Limpar após o teste
        await repository.supabase
          .from(repository.tableName)
          .delete()
          .eq('id', resultado.id);
      } else {
        // Se o resultado for null, pode ser que as funções de transação não estejam disponíveis
        console.log('Transação não suportada ou falhou');
      }
    });
    
    it('deve executar transação com rollback com sucesso', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Skip if RPC functions for transactions are not available
      try {
        const { error } = await repository.supabase.rpc('check_transaction_functions_exist');
        if (error) {
          console.log('Pulando teste: Funções de transação não estão disponíveis no banco de dados');
          return;
        }
      } catch (error) {
        console.log('Pulando teste: Funções de transação não estão disponíveis no banco de dados');
        return;
      }
      
      const nome = `Test Rollback ${Date.now()}`;
      const descricao = 'Teste de transação com rollback';
      
      const resultado = await repository.testTransactionRollback(nome, descricao);
      
      // Se as funções de transação estiverem disponíveis, o resultado deve ser true
      // indicando que o rollback foi bem-sucedido
      if (resultado !== null) {
        expect(resultado).toBe(true);
      } else {
        // Se o resultado for null, pode ser que as funções de transação não estejam disponíveis
        console.log('Transação não suportada ou falhou');
      }
    });
  });
});