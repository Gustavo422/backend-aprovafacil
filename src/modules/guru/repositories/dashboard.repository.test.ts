import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlunoDashboardRepository } from './dashboard.repository.js';

// Supabase client mock superficial
const makeSupabase = () => {
  const chain = () => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis() });
  return {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: [], order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) })
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
};

describe('AlunoDashboardRepository', () => {
  it('deve instanciar sem erros e expor métodos', () => {
    const repo = new AlunoDashboardRepository(makeSupabase());
    expect(typeof repo.fetchSimulados).toBe('function');
    expect(typeof repo.fetchQuestoesSemanais).toBe('function');
    expect(typeof repo.fetchFlashcards).toBe('function');
    expect(typeof repo.fetchSimuladoActivities).toBe('function');
  });
});



