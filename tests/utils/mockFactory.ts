/**
 * Mock Factory
 * Utility for creating mock data for tests
 */

import { vi } from 'vitest';
import { randomUUID } from 'crypto';

/**
 * Creates a mock user
 * @param overrides - Properties to override in the mock user
 * @returns A mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: randomUUID(),
    email: `user-${Math.floor(Math.random() * 10000)}@example.com`,
    nome: 'Test User',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock concurso
 * @param overrides - Properties to override in the mock concurso
 * @returns A mock concurso object
 */
export function createMockConcurso(overrides = {}) {
  return {
    id: randomUUID(),
    nome: 'Concurso Test',
    descricao: 'Descrição do concurso de teste',
    data_inicio: new Date().toISOString(),
    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ativo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock categoria
 * @param overrides - Properties to override in the mock categoria
 * @returns A mock categoria object
 */
export function createMockCategoria(overrides = {}) {
  return {
    id: randomUUID(),
    nome: 'Categoria Test',
    descricao: 'Descrição da categoria de teste',
    parent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock apostila
 * @param overrides - Properties to override in the mock apostila
 * @returns A mock apostila object
 */
export function createMockApostila(overrides = {}) {
  return {
    id: randomUUID(),
    titulo: 'Apostila Test',
    descricao: 'Descrição da apostila de teste',
    categoria_id: randomUUID(),
    autor: 'Autor Test',
    conteudo: 'Conteúdo da apostila de teste',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock Supabase client
 * @param mockResponses - Mock responses for different methods
 * @returns A mock Supabase client
 */
export function createMockSupabaseClient(mockResponses = {}) {
  const defaultResponse = { data: null, error: null };
  
  // Create mock methods for query building
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockUpsert = vi.fn().mockReturnThis();
  
  // Filter methods
  const mockEq = vi.fn().mockReturnThis();
  const mockNeq = vi.fn().mockReturnThis();
  const mockGt = vi.fn().mockReturnThis();
  const mockGte = vi.fn().mockReturnThis();
  const mockLt = vi.fn().mockReturnThis();
  const mockLte = vi.fn().mockReturnThis();
  const mockLike = vi.fn().mockReturnThis();
  const mockIlike = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockIn = vi.fn().mockReturnThis();
  const mockContains = vi.fn().mockReturnThis();
  const mockContainedBy = vi.fn().mockReturnThis();
  const mockFilter = vi.fn().mockReturnThis();
  
  // Result modifiers
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockOffset = vi.fn().mockReturnThis();
  const mockRange = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockMaybeSingle = vi.fn().mockReturnThis();
  
  // Full-text search
  const mockTextSearch = vi.fn().mockReturnThis();
  
  // Allow overriding the final promise resolution
  const mockThen = vi.fn().mockImplementation((callback) => {
    return Promise.resolve(callback(mockResponses.then || defaultResponse));
  });
  
  // Create the mock from method
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    eq: mockEq,
    neq: mockNeq,
    gt: mockGt,
    gte: mockGte,
    lt: mockLt,
    lte: mockLte,
    like: mockLike,
    ilike: mockIlike,
    is: mockIs,
    in: mockIn,
    contains: mockContains,
    containedBy: mockContainedBy,
    filter: mockFilter,
    order: mockOrder,
    limit: mockLimit,
    offset: mockOffset,
    range: mockRange,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    textSearch: mockTextSearch,
    then: mockThen,
    ...mockResponses.from,
  }));
  
  // Create the mock auth object
  const mockAuth = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    session: vi.fn(),
    user: vi.fn(),
    onAuthStateChange: vi.fn(),
    refreshSession: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    setSession: vi.fn(),
    setAuth: vi.fn(),
    ...mockResponses.auth,
  };
  
  // Create the mock storage object
  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url' }, error: null }),
      ...mockResponses.storage,
    })),
  };
  
  // Create the mock rpc method
  const mockRpc = vi.fn().mockImplementation((fn, params) => {
    return Promise.resolve(mockResponses.rpc?.[fn] || { data: null, error: null });
  });
  
  // Create connection status methods
  const mockGetConnectionStatus = vi.fn().mockReturnValue('CONNECTED');
  const mockResetClient = vi.fn().mockResolvedValue(undefined);
  const mockOnConnectionChange = vi.fn();
  
  // Return the complete mock client
  return {
    from: mockFrom,
    auth: mockAuth,
    storage: mockStorage,
    rpc: mockRpc,
    getConnectionStatus: mockGetConnectionStatus,
    resetClient: mockResetClient,
    onConnectionChange: mockOnConnectionChange,
    // Expose all methods for testing
    _methods: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert,
      eq: mockEq,
      neq: mockNeq,
      gt: mockGt,
      gte: mockGte,
      lt: mockLt,
      lte: mockLte,
      like: mockLike,
      ilike: mockIlike,
      is: mockIs,
      in: mockIn,
      contains: mockContains,
      containedBy: mockContainedBy,
      filter: mockFilter,
      order: mockOrder,
      limit: mockLimit,
      offset: mockOffset,
      range: mockRange,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      textSearch: mockTextSearch,
      then: mockThen,
    },
    ...mockResponses.client,
  };
}

/**
 * Creates a mock service
 * @param methods - Methods to include in the mock service
 * @returns A mock service object
 */
export function createMockService(methods = {}) {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...methods,
  };
}

/**
 * Creates a mock repository
 * @param methods - Methods to include in the mock repository
 * @returns A mock repository object
 */
export function createMockRepository(methods = {}) {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...methods,
  };
}

/**
 * Creates a mock request object for Express
 * @param overrides - Properties to override in the mock request
 * @returns A mock request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    session: {},
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Creates a mock response object for Express
 * @returns A mock response object with spies
 */
export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Creates a mock next function for Express middleware
 * @returns A mock next function
 */
export function createMockNext() {
  return vi.fn();
}