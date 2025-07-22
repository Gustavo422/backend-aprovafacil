/**
 * Vitest setup file for backend tests
 * This file is executed before running tests
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './backend/.env' });

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const createClient = vi.fn(() => ({
    auth: {
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      session: vi.fn(),
      user: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => Promise.resolve(callback({ data: [], error: null }))),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    rpc: vi.fn(),
  }));

  return {
    createClient,
  };
});

// Global setup
beforeAll(() => {
  console.log('Starting test suite');
});

// Global teardown
afterAll(() => {
  console.log('Test suite completed');
  vi.clearAllMocks();
});

// Setup before each test
beforeEach(() => {
  // Reset mocks before each test
  vi.resetAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Any cleanup needed after each test
});