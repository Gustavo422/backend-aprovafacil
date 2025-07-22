/**
 * SupabaseConnectionManager Integration Tests
 * Tests the SupabaseConnectionManager class with a real Supabase connection
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';

describe('SupabaseConnectionManager Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  
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
  });
  
  describe('Gerenciamento de Conexão', () => {
    it('deve criar um cliente Supabase válido', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const client = connectionManager.getClient();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth).toBe('object');
    });
    
    it('deve reutilizar a mesma instância de cliente', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const client1 = connectionManager.getClient();
      const client2 = connectionManager.getClient();
      expect(client1).toBe(client2);
    });
    
    it('deve criar um novo cliente quando reset é chamado', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const client1 = connectionManager.getClient();
      connectionManager.resetClient();
      const client2 = connectionManager.getClient();
      expect(client1).not.toBe(client2);
    });
  });
  
  describe('Status da Conexão', () => {
    it('deve reportar o status da conexão', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const status = connectionManager.getConnectionStatus();
      expect(status).toBeDefined();
      // Status could be CONNECTED, CONNECTING, or DISCONNECTED
      expect(['CONNECTED', 'CONNECTING', 'DISCONNECTED']).toContain(status);
    });
  });
  
  describe('Teste de Conexão', () => {
    it('deve testar a conexão com o Supabase', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const result = await connectionManager.testConnection();
      // O resultado pode ser true ou false dependendo da conexão
      // Mas o importante é que não lance exceção
      expect(typeof result).toBe('boolean');
    });
  });
  
  describe('Estatísticas de Conexão', () => {
    it('deve obter estatísticas da conexão', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('Pulando teste: SUPABASE_URL ou SUPABASE_ANON_KEY não definidos');
        return;
      }
      
      const stats = await connectionManager.getConnectionStats();
      expect(stats).toBeDefined();
      expect(stats.status).toBeDefined();
      expect(stats.lastChecked).toBeInstanceOf(Date);
      expect(stats.url).toBe(process.env.SUPABASE_URL);
      
      // Se conectado, deve ter tempo de resposta
      if (stats.status === 'CONNECTED') {
        expect(typeof stats.responseTime).toBe('number');
      }
    });
  });
});