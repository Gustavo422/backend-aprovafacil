/**
 * Retry Mechanism Integration Tests
 * Tests the retry mechanism in the BaseRepository with SupabaseConnectionManager
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';
import { BaseRepository } from '../../src/core/database/base-repository';
import { RetryableError } from '../../src/core/utils/retry';

// Create a test entity interface
interface TestEntity {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
}

// Create a test repository that extends BaseRepository with retry testing capabilities
class RetryTestRepository extends BaseRepository<TestEntity> {
  public retryCount = 0;
  public lastError: Error | null = null;
  
  constructor(options: any) {
    super({
      tableName: 'categorias', // Use an existing table for testing
      retryOptions: {
        maxRetries: 3,
        initialDelayMs: 10, // Use small values for testing
        maxDelayMs: 50,
        backoffFactor: 2,
        retryableErrors: ['connection_error', 'timeout', 'server_error', 'test_error']
      },
      ...options
    });
  }
  
  // Method to test retry mechanism with simulated failures
  async testRetryMechanism(shouldSucceed: boolean, errorCode: string = 'test_error'): Promise<boolean> {
    this.retryCount = 0;
    this.lastError = null;
    
    try {
      await this.executeWithRetry(async () => {
        this.retryCount++;
        
        // Simulate failure for the first N attempts
        if (this.retryCount < 3 || !shouldSucceed) {
          const error: any = new Error('Simulated error for retry testing');
          error.code = errorCode;
          throw new RetryableError('Simulated retryable error', error);
        }
        
        // Return success on the Nth attempt if shouldSucceed is true
        return { data: { success: true }, error: null };
      });
      
      return true;
    } catch (error) {
      this.lastError = error as Error;
      return false;
    }
  }
  
  // Method to test non-retryable errors
  async testNonRetryableError(): Promise<boolean> {
    this.retryCount = 0;
    this.lastError = null;
    
    try {
      await this.executeWithRetry(async () => {
        this.retryCount++;
        
        // Throw a non-retryable error
        const error: any = new Error('Simulated non-retryable error');
        error.code = 'non_retryable_error';
        throw error;
      });
      
      return true;
    } catch (error) {
      this.lastError = error as Error;
      return false;
    }
  }
  
  // Expose protected method for testing
  public async testExecuteWithRetry<T>(queryFn: () => Promise<T>): Promise<T> {
    return this.executeWithRetry(queryFn);
  }
}

describe('Retry Mechanism Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: RetryTestRepository;
  
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
    repository = new RetryTestRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Mecanismo de Retry', () => {
    it('deve tentar novamente após falhas retryable e eventualmente ter sucesso', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const resultado = await repository.testRetryMechanism(true);
      
      expect(resultado).toBe(true);
      expect(repository.retryCount).toBe(3); // Deve ter tentado 3 vezes
      expect(repository.lastError).toBeNull();
    });
    
    it('deve falhar após atingir o número máximo de tentativas', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const resultado = await repository.testRetryMechanism(false);
      
      expect(resultado).toBe(false);
      expect(repository.retryCount).toBe(3); // Deve ter tentado 3 vezes (maxRetries)
      expect(repository.lastError).not.toBeNull();
    });
    
    it('não deve tentar novamente para erros não retryable', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const resultado = await repository.testNonRetryableError();
      
      expect(resultado).toBe(false);
      expect(repository.retryCount).toBe(1); // Deve ter tentado apenas 1 vez
      expect(repository.lastError).not.toBeNull();
    });
    
    it('deve identificar corretamente erros retryable por código', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      // Testar com diferentes códigos de erro
      const codigosRetryable = ['connection_error', 'timeout', 'server_error'];
      const codigosNaoRetryable = ['validation_error', 'not_found', 'unknown_error'];
      
      // Testar códigos retryable
      for (const codigo of codigosRetryable) {
        const resultado = await repository.testRetryMechanism(false, codigo);
        expect(resultado).toBe(false);
        expect(repository.retryCount).toBe(3); // Deve ter tentado 3 vezes
      }
      
      // Testar códigos não retryable
      for (const codigo of codigosNaoRetryable) {
        repository.retryCount = 0;
        
        try {
          // Usar diretamente o método executeWithRetry para testar
          await repository.testExecuteWithRetry(async () => {
            repository.retryCount++;
            
            // Throw a non-retryable error
            const error: any = new Error(`Simulated error: ${codigo}`);
            error.code = codigo;
            throw error;
          });
          
          // Não deve chegar aqui
          expect(true).toBe(false);
        } catch (error) {
          expect(repository.retryCount).toBe(1); // Deve ter tentado apenas 1 vez
        }
      }
    });
  });
});