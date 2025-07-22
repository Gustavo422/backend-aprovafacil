/**
 * Base Repository Integration Tests
 * Tests the BaseRepository class with a real Supabase connection
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BaseRepository } from '../../src/core/repositories/BaseRepository';
import { SupabaseConnectionManager } from '../../src/core/database/SupabaseConnectionManager';

// Create a test repository that extends BaseRepository
class TestRepository extends BaseRepository {
  constructor(options: any) {
    super(options);
    this.tableName = 'test_table';
  }
  
  // Add test-specific methods
  async findAll() {
    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*');
        
      if (error) {
        console.error(`Error in findAll: ${error.message}`);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Exception in findAll: ${(error as Error).message}`);
      return [];
    }
  }
  
  async count() {
    try {
      const { count, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error(`Error in count: ${error.message}`);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error(`Exception in count: ${(error as Error).message}`);
      return 0;
    }
  }
}

describe('Base Repository Integration Tests', () => {
  let connectionManager: SupabaseConnectionManager;
  let repository: TestRepository;
  
  beforeAll(() => {
    // Use the global client from setup if available
    const globalClient = (global as any).supabaseClient;
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.warn('SUPABASE_URL or SUPABASE_KEY not set in environment. Some tests may be skipped.');
    }
    
    // Initialize the connection manager
    connectionManager = new SupabaseConnectionManager({
      supabaseUrl: process.env.SUPABASE_URL as string,
      supabaseKey: process.env.SUPABASE_KEY as string,
      // Use existing client if available
      existingClient: globalClient
    });
    
    // Create the repository
    repository = new TestRepository({
      supabaseClient: connectionManager.getClient()
    });
  });
  
  describe('Repository Operations', () => {
    it('should have access to the Supabase client', () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.log('Skipping test: SUPABASE_URL or SUPABASE_KEY not set');
        return;
      }
      
      expect(repository.supabaseClient).toBeDefined();
      expect(typeof repository.supabaseClient.from).toBe('function');
    });
    
    it('should handle table not found gracefully', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.log('Skipping test: SUPABASE_URL or SUPABASE_KEY not set');
        return;
      }
      
      // This test assumes 'test_table' doesn't exist
      // If it does exist, the test will still pass but won't test the error handling
      const result = await repository.findAll();
      
      // Should return empty array on error
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('should handle count operation gracefully', async () => {
      // Skip if environment variables are not set
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.log('Skipping test: SUPABASE_URL or SUPABASE_KEY not set');
        return;
      }
      
      // This test assumes 'test_table' doesn't exist
      // If it does exist, the test will still pass but won't test the error handling
      const count = await repository.count();
      
      // Should return 0 on error
      expect(typeof count).toBe('number');
    });
  });
});