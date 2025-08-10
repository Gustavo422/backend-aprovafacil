import type { EnhancedStatsDTO, ActivityDTO } from '../dtos/dashboard.dto.js';

// Nota: os mapeadores aqui atuam como boundary: aceitam objetos "soltos" vindos do Supabase
// e convertem para os DTOs estáveis consumidos pelo frontend.

export function mapEnhancedStats(input: {
  totalSimulados: number;
  totalQuestoes: number;
  totalStudyTime: number;
  averageScore: number;
  accuracyRate: number;
  approvalProbability: number;
  studyStreak: number;
  weeklyProgress: EnhancedStatsDTO['weeklyProgress'];
  disciplinaStats: EnhancedStatsDTO['disciplinaStats'];
  performanceHistory: EnhancedStatsDTO['performanceHistory'];
  goalProgress: EnhancedStatsDTO['goalProgress'];
  competitiveRanking: EnhancedStatsDTO['competitiveRanking'];
}): EnhancedStatsDTO {
  return {
    totalSimulados: Number(input.totalSimulados) || 0,
    totalQuestoes: Number(input.totalQuestoes) || 0,
    totalStudyTime: Number(input.totalStudyTime) || 0,
    averageScore: Number(input.averageScore) || 0,
    accuracyRate: Number(input.accuracyRate) || 0,
    approvalProbability: Number(input.approvalProbability) || 0,
    studyStreak: Number(input.studyStreak) || 0,
    weeklyProgress: input.weeklyProgress,
    disciplinaStats: input.disciplinaStats,
    performanceHistory: input.performanceHistory,
    goalProgress: input.goalProgress,
    competitiveRanking: input.competitiveRanking,
  };
}

export function mapActivity(input: any): ActivityDTO {
  return {
    id: String(input.id),
    type: input.type,
    titulo: String(input.titulo ?? ''),
    descricao: String(input.descricao ?? ''),
    time: String(input.time ?? ''),
    created_at: String(input.created_at ?? new Date().toISOString()),
    score: typeof input.score === 'number' ? input.score : undefined,
    improvement: typeof input.improvement === 'number' ? input.improvement : undefined,
  };
}


