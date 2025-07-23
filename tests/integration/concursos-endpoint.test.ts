import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../src/app';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../src/utils/logger';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

describe('Concursos Endpoint Integration Tests', () => {
  let request;

  beforeAll(() => {
    request = supertest(app);
    vi.spyOn(logger, 'info');
    vi.spyOn(logger, 'error');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('deve listar concursos com sucesso', async () => {
    const response = await request.get('/api/concursos').set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Início da requisição GET /api/concursos'));
  });

  it('deve lidar com erro de autenticação', async () => {
    const response = await request.get('/api/concursos');
    expect(response.status).toBe(401);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Usuário não autenticado'));
  });

  it('deve simular falha de conexão com Supabase', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Conexão falhou' } }),
    });
    const response = await request.get('/api/concursos').set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Erro ao executar query Supabase para concursos'), expect.objectContaining({ error: expect.objectContaining({ message: 'Conexão falhou' }) }));
  });
}); 