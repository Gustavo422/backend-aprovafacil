import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { supabase } from '../../../config/supabase.js';
import concursoPreferenceRouter from './route.js';
import { logger } from '../../../utils/logger.js';
import jwt from 'jsonwebtoken';

// Mock supabase
vi.mock('../../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis()
  }
}));

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
  decode: vi.fn()
}));

describe('Concurso Preference API', () => {
  let app: express.Application;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockToken = 'valid.jwt.token';
  
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/user/concurso-preference', concursoPreferenceRouter);
    
    // Mock JWT verification
    vi.mocked(jwt.verify).mockImplementation(() => ({
      userId: mockUserId
    }));

    vi.mocked(jwt.decode).mockImplementation(() => ({
      userId: mockUserId
    }));

    // Mock supabase user query
    // @ts-expect-error Mock incompatível com tipo real do Supabase
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'usuarios') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: mockUserId, nome: 'Test User', ativo: true },
                  error: null
                })
              })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis()
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/user/concurso-preference', () => {
    it('should return user preferences when they exist', async () => {
      // Mock preference data
      const mockPreference = {
        id: 'pref-123',
        usuario_id: mockUserId,
        concurso_id: 'concurso-123',
        pode_alterar_ate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        ativo: true
      };
      
      // Setup mock for preference query
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: mockPreference,
                    error: null
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual(mockPreference);
      expect(response.body).toHaveProperty('canChange');
      expect(response.body).toHaveProperty('daysUntilChange');
    });

    it('should return fallback data when no active preferences exist', async () => {
      // Mock no active preference but has inactive one
      const mockInactivePreference = {
        id: 'pref-123',
        usuario_id: mockUserId,
        concurso_id: 'concurso-123',
        pode_alterar_ate: new Date().toISOString(),
        ativo: false
      };
      
      // Setup mock for preference query - first query returns PGRST116 error (not found)
      let firstQueryExecuted = false;
      
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          if (!firstQueryExecuted) {
            firstQueryExecuted = true;
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => ({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows returned' }
                    })
                  })
                })
              })
            };
          } else {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      single: () => ({
                        data: mockInactivePreference,
                        error: null
                      })
                    })
                  })
                })
              })
            };
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual(mockInactivePreference);
      expect(response.body).toHaveProperty('isFallback', true);
      expect(response.body).toHaveProperty('canChange', true);
    });

    it('should return empty object when no preferences exist at all', async () => {
      // Setup mock for preference query - both queries return not found
      let queryCount = 0;
      
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          queryCount++;
          if (queryCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => ({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows returned' }
                    })
                  })
                })
              })
            };
          } else {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      single: () => ({
                        data: null,
                        error: { code: 'PGRST116', message: 'No rows returned' }
                      })
                    })
                  })
                })
              })
            };
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('isFallback', true);
      expect(response.body).toHaveProperty('canChange', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle database schema errors correctly', async () => {
      // Mock database schema error (column does not exist)
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: null,
                    error: { 
                      code: '42703', 
                      message: 'column "user_id" does not exist',
                      details: 'Error occurred in query'
                    }
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erro de banco de dados');
      expect(response.body).toHaveProperty('code', 'DB_SCHEMA_ERROR');
      expect(response.body).toHaveProperty('details');
      
      // Verify logger was called with appropriate error
      expect(logger.error).toHaveBeenCalledWith(
        'Erro de esquema de banco de dados',
        'backend',
        expect.objectContaining({
          error: 'column "user_id" does not exist',
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        })
      );
    });

    it('should handle general database errors correctly', async () => {
      // Mock general database error
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: null,
                    error: { 
                      code: 'P0001', 
                      message: 'Database error',
                      details: 'Connection timeout'
                    }
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erro ao buscar preferência');
      expect(response.body).toHaveProperty('code', 'DB_QUERY_ERROR');
      
      // Verify logger was called with appropriate error
      expect(logger.error).toHaveBeenCalledWith(
        'Erro ao buscar preferência do usuário',
        'backend',
        expect.objectContaining({
          error: 'Database error',
          errorCode: 'P0001'
        })
      );
    });

    it('should handle authentication errors correctly', async () => {
      // Mock authentication failure - both verify and decode should fail
      // @ts-expect-error Mock incompatível com tipo real do JWT
      (jwt.verify as vi.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // @ts-expect-error Mock incompatível com tipo real do JWT
      (jwt.decode as vi.Mock).mockImplementation(() => {
        return null; // This will cause the middleware to return 401
      });
      
      // Make request
      const response = await request(app)
        .get('/api/user/concurso-preference')
        .set('Authorization', `Bearer invalid-token`);
      
      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/user/concurso-preference', () => {
    it('should create a new preference successfully', async () => {
      const mockConcursoId = 'concurso-123';
      const mockNewPreference = {
        id: 'pref-new-123',
        usuario_id: mockUserId,
        concurso_id: mockConcursoId,
        pode_alterar_ate: '2025-08-20T00:00:00.000Z', // Fixed date instead of expect.any
        ativo: true
      };
      
      // Mock concurso query
      let queryCount = 0;
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'concursos') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockConcursoId, nome: 'Test Concurso', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          queryCount++;
          if (queryCount === 1) {
            // First query - check existing preferences
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => ({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows returned' }
                    })
                  })
                })
              })
            };
          } else {
            // Second query - insert new preference
            return {
              insert: () => ({
                select: () => ({
                  single: () => ({
                    data: mockNewPreference,
                    error: null
                  })
                })
              })
            };
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .post('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ concurso_id: mockConcursoId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      
      // Use a more flexible assertion that doesn't rely on exact date matching
      expect(response.body.data).toHaveProperty('id', mockNewPreference.id);
      expect(response.body.data).toHaveProperty('usuario_id', mockNewPreference.usuario_id);
      expect(response.body.data).toHaveProperty('concurso_id', mockNewPreference.concurso_id);
      expect(response.body.data).toHaveProperty('ativo', mockNewPreference.ativo);
    });

    it('should handle database schema errors on insert correctly', async () => {
      const mockConcursoId = 'concurso-123';
      
      // Mock concurso query and schema error on insert
      let queryCount = 0;
      // @ts-expect-error Mock incompatível com tipo real do Supabase
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'usuarios') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockUserId, nome: 'Test User', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'concursos') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: { id: mockConcursoId, nome: 'Test Concurso', ativo: true },
                    error: null
                  })
                })
              })
            })
          };
        } else if (table === 'preferencias_usuario_concurso') {
          queryCount++;
          if (queryCount === 1) {
            // First query - check existing preferences
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => ({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows returned' }
                    })
                  })
                })
              })
            };
          } else {
            // Second query - insert new preference with schema error
            return {
              insert: () => ({
                select: () => ({
                  single: () => ({
                    data: null,
                    error: { 
                      code: '42703', 
                      message: 'column "user_id" does not exist',
                      details: 'Error occurred in query'
                    }
                  })
                })
              })
            };
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis()
        };
      });
      
      // Make request
      const response = await request(app)
        .post('/api/user/concurso-preference')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ concurso_id: mockConcursoId });
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erro de banco de dados');
      expect(response.body).toHaveProperty('code', 'DB_SCHEMA_ERROR');
      
      // Verify logger was called with appropriate error
      expect(logger.error).toHaveBeenCalledWith(
        'Erro de esquema de banco de dados',
        'backend',
        expect.objectContaining({
          error: 'column "user_id" does not exist',
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        })
      );
    });
  });
});