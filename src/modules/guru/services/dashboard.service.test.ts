import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuruDashboardService } from './dashboard.service.js';

const makeRepo = (overrides: Partial<Record<string, unknown[]>> = {}) => {
  const base = {
    fetchSimulados: vi.fn().mockResolvedValue(overrides.fetchSimulados ?? [
      { id: '1', concluido_em: new Date().toISOString(), tempo_gasto_minutos: 30, pontuacao: 70 },
      { id: '2', concluido_em: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), tempo_gasto_minutos: 45, pontuacao: 80 },
    ]),
    fetchQuestoesSemanais: vi.fn().mockResolvedValue(overrides.fetchQuestoesSemanais ?? [
      { id: 'q1', correta: true, criado_em: new Date().toISOString() },
      { id: 'q2', correta: false, criado_em: new Date().toISOString() },
    ]),
    fetchFlashcards: vi.fn().mockResolvedValue(overrides.fetchFlashcards ?? [
      { id: 'f1', status: 'dominado', atualizado_em: new Date().toISOString() },
      { id: 'f2', status: 'aprendendo', atualizado_em: new Date().toISOString() },
    ]),
    fetchSimuladoActivities: vi.fn().mockResolvedValue(overrides.fetchSimuladoActivities ?? [
      { id: '1', concluido_em: new Date(Date.now() - 60_000).toISOString(), tempo_gasto_minutos: 30, pontuacao: 70, simulados: { titulo: 'S1', dificuldade: 'Médio' } },
      { id: '2', concluido_em: new Date().toISOString(), tempo_gasto_minutos: 40, pontuacao: 78, simulados: { titulo: 'S2', dificuldade: 'Difícil' } },
    ]),
    fetchFlashcardActivities: vi.fn().mockResolvedValue(overrides.fetchFlashcardActivities ?? [
      { id: '10', criado_em: new Date().toISOString(), status: 'revisado', atualizado_em: new Date().toISOString(), cartoes_memorizacao: { frente: 'A', disciplina: 'Português' } },
    ]),
    fetchApostilaActivities: vi.fn().mockResolvedValue(overrides.fetchApostilaActivities ?? [
      { id: '20', criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), percentual_progresso: 50, conteudo_apostila: { titulo: 'Apostila 1' } },
    ]),
  };
  return base as unknown as import('../repositories/dashboard.repository.js').IAlunoDashboardRepository;
};

describe('GuruDashboardService', () => {
  let service: GuruDashboardService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new GuruDashboardService(repo);
  });

  it('getEnhancedStats deve calcular agregados coerentes', async () => {
    const out = await service.getEnhancedStats('user-1');
    expect(out.totalSimulados).toBeGreaterThanOrEqual(2);
    expect(out.totalQuestoes).toBeGreaterThanOrEqual(2);
    expect(out.averageScore).toBeGreaterThanOrEqual(0);
    expect(out.accuracyRate).toBeGreaterThanOrEqual(0);
    expect(out.weeklyProgress.simulados).toBeGreaterThanOrEqual(0);
    expect(out.goalProgress.targetScore).toBe(70);
  });

  it('getActivities deve combinar e ordenar atividades por data e aplicar limit', async () => {
    const out = await service.getActivities('user-1', { limit: 5 });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < out.length; i++) {
      const prev = new Date(out[i - 1]!.created_at).getTime();
      const cur = new Date(out[i]!.created_at).getTime();
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });
});



