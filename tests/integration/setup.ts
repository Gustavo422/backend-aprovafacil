/**
 * Integration Tests Setup
 * This file runs before all integration tests to set up the environment
 */

import { afterAll, beforeAll, vi } from 'vitest';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mockEnv } from '../utils/testUtils';

// Load environment variables from .env.test if available, otherwise use .env
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

// Global variables for integration tests
let supabaseClient: any;
let envMock: any;

// Setup before all tests
beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  // Verificar se as credenciais do Supabase estão disponíveis
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY não definidos no ambiente de teste.');
    console.warn('Alguns testes de integração podem ser ignorados.');
  } else {
    console.log(`✅ Usando Supabase URL: ${process.env.SUPABASE_URL}`);
  }
  
  // Create a real Supabase client for integration tests
  try {
    supabaseClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string, // Usando a chave anônima para testes
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Test the connection with a simple query
    const { data, error } = await supabaseClient.from('categorias').select('count').limit(1);
    
    if (error) {
      console.warn(`⚠️ Aviso: Não foi possível conectar ao Supabase: ${error.message}`);
      console.warn('Os testes de integração podem falhar se exigirem uma conexão válida');
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso para testes de integração');
      console.log(`📊 Dados recebidos: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.warn(`⚠️ Aviso: Erro ao inicializar o cliente Supabase: ${(error as Error).message}`);
    console.warn('Os testes de integração podem falhar se exigirem uma conexão válida');
  }
  
  // Make the client available globally for tests
  (global as any).supabaseClient = supabaseClient;
});

// Cleanup after all tests
afterAll(async () => {
  console.log('Limpando ambiente de teste de integração...');
  
  // Close any connections or cleanup resources
  if (supabaseClient) {
    // No explicit close method for Supabase client
    // but we can clean up any subscriptions or listeners if needed
  }
  
  // Clear mocks
  vi.clearAllMocks();
});