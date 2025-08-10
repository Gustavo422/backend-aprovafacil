import { describe, it, expect } from 'vitest';
import { mapEnhancedStats, mapActivity } from './dashboard.mappers.js';

describe('dashboard.mappers', () => {
  it('mapEnhancedStats deve normalizar números e manter estruturas aninhadas', () => {
    const input = {
      totalSimulados: '3' as unknown as number,
      totalQuestoes: '42' as unknown as number,
      totalStudyTime: '120' as unknown as number,
      averageScore: '75.5' as unknown as number,
      accuracyRate: '88.2' as unknown as number,
      approvalProbability: '64.4' as unknown as number,
      studyStreak: '5' as unknown as number,
      weeklyProgress: { simulados: 1, questoes: 10, studyTime: 60, scoreImprovement: 2.5 },
      disciplinaStats: [
        { disciplina: 'Português', total_questions: 10, resposta_corretas: 8, accuracy_rate: 80, trend: 'up' as const, color: '#000' },
      ],
      performanceHistory: [],
      goalProgress: { targetScore: 70, currentScore: 65, targetDate: '2025-12-31', daysRemaining: 120, onTrack: false },
      competitiveRanking: { position: 10, totalusuarios: 200, percentile: 95 },
    };

    const out = mapEnhancedStats(input);

    expect(out.totalSimulados).toBe(3);
    expect(out.totalQuestoes).toBe(42);
    expect(out.totalStudyTime).toBe(120);
    expect(out.averageScore).toBeCloseTo(75.5);
    expect(out.accuracyRate).toBeCloseTo(88.2);
    expect(out.approvalProbability).toBeCloseTo(64.4);
    expect(out.studyStreak).toBe(5);
    expect(out.weeklyProgress.simulados).toBe(1);
    expect(out.disciplinaStats[0].disciplina).toBe('Português');
    expect(out.goalProgress.targetScore).toBe(70);
    expect(out.competitiveRanking.position).toBe(10);
  });

  it('mapActivity deve mapear campos opcionais corretamente', () => {
    const input = {
      id: 123,
      type: 'simulado',
      titulo: 'Teste',
      descricao: 'desc',
      time: '5min',
      created_at: '2025-01-01T00:00:00Z',
      score: 72,
      improvement: 3.5,
    };

    const out = mapActivity(input);
    expect(out.id).toBe('123');
    expect(out.type).toBe('simulado');
    expect(out.titulo).toBe('Teste');
    expect(out.descricao).toBe('desc');
    expect(out.time).toBe('5min');
    expect(out.created_at).toBe('2025-01-01T00:00:00Z');
    expect(out.score).toBe(72);
    expect(out.improvement).toBe(3.5);
  });
});


