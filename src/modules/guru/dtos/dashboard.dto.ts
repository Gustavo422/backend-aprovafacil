// zod não é utilizado diretamente neste arquivo

export type ActivityType = 'simulado' | 'questao' | 'flashcard';

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  titulo: string;
  descricao: string;
  time: string;
  created_at: string;
  score?: number;
  improvement?: number;
}

export interface WeeklyProgressDTO {
  simulados: number;
  questoes: number;
  studyTime: number;
  scoreImprovement: number;
}

export interface DisciplinaStatsDTO {
  disciplina: string;
  total_questions: number;
  resposta_corretas: number;
  accuracy_rate: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface PerformanceHistoryDTO {
  date: string;
  score: number;
  accuracy: number;
  studyTime: number;
}

export interface GoalProgressDTO {
  targetScore: number;
  currentScore: number;
  targetDate: string;
  daysRemaining: number;
  onTrack: boolean;
}

export interface CompetitiveRankingDTO {
  position: number;
  totalusuarios: number;
  percentile: number;
}

export interface EnhancedStatsDTO {
  totalSimulados: number;
  totalQuestoes: number;
  totalStudyTime: number;
  averageScore: number;
  accuracyRate: number;
  approvalProbability: number;
  studyStreak: number;
  weeklyProgress: WeeklyProgressDTO;
  disciplinaStats: DisciplinaStatsDTO[];
  performanceHistory: PerformanceHistoryDTO[];
  goalProgress: GoalProgressDTO;
  competitiveRanking: CompetitiveRankingDTO;
}