/* global Request */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, setupDependencies } from './route.js';

// Mock do NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: options?.headers || {}
    }))
  }
}));

describe('User Concurso Preference API', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  };

  const mockLogger = {
    error: vi.fn(),
    info: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupDependencies(mockSupabase, mockLogger);
  });

  describe('GET /api/user/concurso-preference', () => {
    it('deve retornar preferência do usuário com sucesso', async () => {
      // Mock do usuário autenticado
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock da preferência encontrada
      const mockPreference = {
        id: 'pref-123',
        user_id: 'user-123',
        concurso_id: 'concurso-123',
        can_change_until: new Date(Date.now() + 86400000).toISOString(), // 1 dia no futuro
        is_active: true
      };

      const mockSupabaseClient = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPreference,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockSupabaseClient);

      const response = await GET();
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it('deve retornar erro quando usuário não autenticado', async () => {
      // Mock do usuário não autenticado
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      const response = await GET();
      
      expect(response).toBeDefined();
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/user/concurso-preference', () => {
    it('deve criar preferência do usuário com sucesso', async () => {
      // Mock do usuário autenticado
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock do concurso encontrado
      const mockConcurso = {
        id: 'concurso-123',
        nome: 'Concurso Teste',
        is_active: true
      };

      // Mock da nova preferência criada
      const mockNewPreference = {
        id: 'pref-123',
        user_id: 'user-123',
        concurso_id: 'concurso-123',
        can_change_until: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      // Mock da preferência existente (não encontrada)
      const mockSupabaseClient = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ // Primeira chamada - verificar concurso
            data: mockConcurso,
            error: null
          })
          .mockResolvedValueOnce({ // Segunda chamada - verificar preferência existente
            data: null,
            error: { code: 'PGRST116' }
          }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockNewPreference,
              error: null
            })
          })
        }),
        update: vi.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockReturnValue(mockSupabaseClient);

      const mockRequest = new Request('http://localhost:3000/api/user/concurso-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          concurso_id: 'concurso-123'
        })
      });

      const response = await POST(mockRequest);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it('deve retornar erro para dados inválidos', async () => {
      // Mock do usuário autenticado
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      const mockRequest = new Request('http://localhost:3000/api/user/concurso-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          // Dados inválidos - sem concurso_id
        })
      });

      const response = await POST(mockRequest);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/user/concurso-preference', () => {
    it('deve atualizar preferência do usuário com sucesso', async () => {
      // Mock do usuário autenticado
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      });

      // Mock da preferência encontrada
      const mockPreference = {
        id: 'pref-123',
        user_id: 'user-123',
        concurso_id: 'concurso-123',
        is_active: true
      };

      const mockSupabaseClient = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ // Buscar preferência
            data: mockPreference,
            error: null
          })
          .mockResolvedValueOnce({ // Atualizar preferência
            data: { ...mockPreference, is_active: false },
            error: null
          }),
        update: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockPreference, is_active: false },
              error: null
            })
          })
        })
      };

      mockSupabase.from.mockReturnValue(mockSupabaseClient);

      const mockRequest = new Request('http://localhost:3000/api/user/concurso-preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          is_active: false
        })
      });

      const response = await PUT(mockRequest);
      
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });
  });
}); 