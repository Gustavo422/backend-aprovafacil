import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestoesSemanaisStatusService } from './questoes-semanais-status.service.js';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
    rpc: vi.fn(() => ({ data: null, error: null })),
  })),
} as any;

describe('QuestoesSemanaisStatusService', () => {
  let service: QuestoesSemanaisStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuestoesSemanaisStatusService(mockSupabase);
  });

  describe('obterOuCriarStatus', () => {
    it('deve retornar status existente se encontrado', async () => {
      const mockStatus = {
        id: 'status-1',
        usuario_id: 'user-1',
        concurso_id: 'concurso-1',
        semana_atual: 2,
        inicio_semana_em: '2024-12-01T00:00:00Z',
        fim_semana_em: '2024-12-08T00:00:00Z',
        modo_desbloqueio: 'strict',
        criado_em: '2024-12-01T00:00:00Z',
        atualizado_em: '2024-12-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStatus, error: null }),
          }),
        }),
      });

      const result = await service.obterOuCriarStatus('user-1', 'concurso-1');
      
      expect(result).toEqual(mockStatus);
      expect(mockSupabase.from).toHaveBeenCalledWith('usuario_questoes_semanais_status');
    });

    it('deve criar novo status se não existir', async () => {
      // Mock para não encontrar status existente
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'new-status' }, 
              error: null 
            }),
          }),
        }),
      });

      const result = await service.obterOuCriarStatus('user-1', 'concurso-1');
      
      expect(result).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('usuario_questoes_semanais_status');
    });
  });

  describe('podeAvançar', () => {
    it('deve retornar true para modo accelerated', async () => {
      const mockStatus = {
        modo_desbloqueio: 'accelerated',
        fim_semana_em: '2024-12-01T00:00:00Z',
      };

      vi.spyOn(service as any, 'obterOuCriarStatus').mockResolvedValue(mockStatus as any);

      const result = await service.podeAvançar('user-1', 'concurso-1');
      
      expect(result).toBe(true);
    });

    it('deve retornar true para modo strict quando prazo expirou', async () => {
      const mockStatus = {
        modo_desbloqueio: 'strict',
        fim_semana_em: '2024-12-01T00:00:00Z', // Data passada
      };

      vi.spyOn(service as any, 'obterOuCriarStatus').mockResolvedValue(mockStatus as any);

      const result = await service.podeAvançar('user-1', 'concurso-1');
      
      expect(result).toBe(true);
    });

    it('deve retornar false para modo strict quando prazo não expirou', async () => {
      const mockStatus = {
        modo_desbloqueio: 'strict',
        fim_semana_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
      };

      vi.spyOn(service as any, 'obterOuCriarStatus').mockResolvedValue(mockStatus as any);

      const result = await service.podeAvançar('user-1', 'concurso-1');
      
      expect(result).toBe(false);
    });
  });

  describe('avancarSemanaStrict', () => {
    it('deve chamar RPC para avançar semana', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await service.avancarSemanaStrict('user-1', 'concurso-1');
      
      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('avancar_semana_strict', {
        p_usuario_id: 'user-1',
        p_concurso_id: 'concurso-1',
        p_agora: expect.any(String),
        p_duracao_dias: 7,
      });
    });
  });

  describe('avancarSemanaAccelerated', () => {
    it('deve atualizar status para próxima semana', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await service.avancarSemanaAccelerated('user-1', 'concurso-1', 2);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('usuario_questoes_semanais_status');
    });
  });

  describe('processarAvancosAutomaticos', () => {
    it('deve retornar zeros para modo não-strict', async () => {
      // Mock para modo não-strict
      vi.spyOn(service as any, 'config', 'get').mockReturnValue({ unlockPolicy: 'accelerated' });

      const result = await service.processarAvancosAutomaticos();
      
      expect(result).toEqual({ processados: 0, avancados: 0, erros: 0 });
    });

    it('deve processar avanços para modo strict', async () => {
      // Mock para modo strict
      vi.spyOn(service as any, 'config', 'get').mockReturnValue({ unlockPolicy: 'strict' });

      // Mock para buscar usuários
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ 
                data: [
                  { usuario_id: 'user-1', concurso_id: 'concurso-1', semana_atual: 1 },
                  { usuario_id: 'user-2', concurso_id: 'concurso-1', semana_atual: 2 },
                ], 
                error: null 
              }),
            }),
          }),
        }),
      });

      // Mock para avançar semana
      vi.spyOn(service, 'avancarSemanaStrict').mockResolvedValue(true);

      const result = await service.processarAvancosAutomaticos();
      
      expect(result.processados).toBe(2);
      expect(result.avancados).toBe(2);
      expect(result.erros).toBe(0);
    });
  });
});
