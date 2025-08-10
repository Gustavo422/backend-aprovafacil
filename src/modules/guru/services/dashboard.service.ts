import type { IAlunoDashboardRepository } from '../repositories/dashboard.repository';
import type { EnhancedStatsDTO, ActivityDTO } from '../dtos/dashboard.dto';
import { mapActivity, mapEnhancedStats } from '../mappers/dashboard.mappers.js';

export class GuruDashboardService {
  private readonly repo: IAlunoDashboardRepository;

  constructor(repo: IAlunoDashboardRepository) {
    this.repo = repo;
  }

  async getEnhancedStats(usuarioId: string): Promise<EnhancedStatsDTO> {
    const [simulados, questoes, flashcards] = await Promise.all([
      this.repo.fetchSimulados(usuarioId),
      this.repo.fetchQuestoesSemanais(usuarioId),
      this.repo.fetchFlashcards(usuarioId),
    ]);

    // Regras de agregação/coerência com tolerância a dados faltantes e outliers
    const totalSimulados = simulados.length;
    const somaPontuacoes = simulados.reduce((acc, s) => acc + (typeof s.pontuacao === 'number' ? s.pontuacao : 0), 0);
    const averageScore = totalSimulados > 0 ? somaPontuacoes / totalSimulados : 0;

    const totalQuestoes = questoes.length;
    const questoesCorretas = questoes.filter(q => q.correta === true).length;
    const accuracyRate = totalQuestoes > 0 ? (questoesCorretas / totalQuestoes) * 100 : 0;

    const totalStudyTime = simulados.reduce((acc, s) => acc + (typeof s.tempo_gasto_minutos === 'number' ? s.tempo_gasto_minutos : 0), 0);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const simuladosUltimaSemana = simulados.filter(s => s.concluido_em && !Number.isNaN(new Date(s.concluido_em).getTime()) && new Date(s.concluido_em) >= sevenDaysAgo).length;
    const simuladosSemanaAnterior = simulados.filter(s => s.concluido_em && !Number.isNaN(new Date(s.concluido_em).getTime()) && new Date(s.concluido_em) >= fourteenDaysAgo && new Date(s.concluido_em) < sevenDaysAgo).length;
    const questoesUltimaSemana = questoes.filter(q => !Number.isNaN(new Date(q.criado_em).getTime()) && new Date(q.criado_em) >= sevenDaysAgo).length;

    const disciplinaStats = [
      {
        disciplina: 'Português',
        total_questions: Math.floor(totalQuestoes * 0.3),
        resposta_corretas: Math.floor(questoesCorretas * 0.3),
        accuracy_rate: Math.round(accuracyRate * 100) / 100,
        trend: 'up' as const,
        color: '#3B82F6',
      },
      {
        disciplina: 'Matemática',
        total_questions: Math.floor(totalQuestoes * 0.25),
        resposta_corretas: Math.floor(questoesCorretas * 0.25),
        accuracy_rate: Math.round(accuracyRate * 0.9 * 100) / 100,
        trend: 'stable' as const,
        color: '#10B981',
      },
      {
        disciplina: 'Direito',
        total_questions: Math.floor(totalQuestoes * 0.2),
        resposta_corretas: Math.floor(questoesCorretas * 0.2),
        accuracy_rate: Math.round(accuracyRate * 1.1 * 100) / 100,
        trend: 'up' as const,
        color: '#F59E0B',
      },
    ];

    const studyStreak = this.calculateActiveDays(simulados, questoes, flashcards);

    const targetDateStr = this.getIsoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return mapEnhancedStats({
      totalSimulados,
      totalQuestoes,
      totalStudyTime,
      averageScore: Math.round(averageScore * 100) / 100,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      approvalProbability: Math.round(((accuracyRate * 0.7) + ((flashcards.length > 0 ? flashcards.filter(f => f.status === 'dominado').length / flashcards.length : 0) * 100) * 0.3) * 100) / 100,
      studyStreak,
      weeklyProgress: {
        simulados: simuladosUltimaSemana,
        questoes: questoesUltimaSemana,
        studyTime: simulados
          .filter(s => s.concluido_em && !Number.isNaN(new Date(s.concluido_em).getTime()) && new Date(s.concluido_em) >= sevenDaysAgo)
          .reduce((acc, s) => acc + (typeof s.tempo_gasto_minutos === 'number' ? s.tempo_gasto_minutos : 0), 0),
        scoreImprovement: simuladosUltimaSemana > simuladosSemanaAnterior ? 5.2 : (simuladosUltimaSemana < simuladosSemanaAnterior ? -2.1 : 0),
      },
      disciplinaStats,
      performanceHistory: [],
      goalProgress: {
        targetScore: 70,
        currentScore: Math.round(averageScore * 100) / 100,
        targetDate: targetDateStr,
        daysRemaining: 30,
        onTrack: averageScore >= 60,
      },
      competitiveRanking: {
        position: Math.floor(Math.random() * 100) + 1,
        totalusuarios: 1250,
        percentile: Math.floor(Math.random() * 20) + 80,
      },
    });
  }

  async getActivities(usuarioId: string, options?: { limit?: number }): Promise<ActivityDTO[]> {
    const [simulados, flashcards, apostilas] = await Promise.all([
      this.repo.fetchSimuladoActivities(usuarioId),
      this.repo.fetchFlashcardActivities(usuarioId),
      this.repo.fetchApostilaActivities(usuarioId),
    ]);

    const activities: ActivityDTO[] = [];

    for (const progress of simulados) {
      activities.push(mapActivity({
        id: `simulado-${progress.id}`,
        type: 'simulado',
        titulo: progress.simulados?.titulo || 'Simulado',
        descricao: `Pontuação: ${progress.pontuacao}% - ${progress.simulados?.dificuldade || 'Médio'}`,
        time: progress.tempo_gasto_minutos ? `${progress.tempo_gasto_minutos}min` : '',
        created_at: progress.concluido_em,
        score: progress.pontuacao,
        improvement: 0,
      }));
    }

    for (const progress of flashcards) {
      activities.push(mapActivity({
        id: `flashcard-${progress.id}`,
        type: 'flashcard',
        titulo: 'Revisão de Flashcard',
        descricao: `${progress.cartoes_memorizacao?.disciplina || 'Disciplina'} - ${progress.status}`,
        time: '',
        created_at: progress.atualizado_em,
      }));
    }

    for (const progress of apostilas) {
      activities.push(mapActivity({
        id: `apostila-${progress.id}`,
        type: 'questao',
        titulo: 'Estudo de Apostila',
        descricao: `${progress.conteudo_apostila?.titulo || 'Apostila'} - ${progress.percentual_progresso ?? 0}% concluído`,
        time: '',
        created_at: progress.atualizado_em,
      }));
    }

    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calcular melhorias para simulados
    const simuladosOnly = simulados;
    if (simuladosOnly && simuladosOnly.length > 1) {
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        if (activity && activity.type === 'simulado' && typeof activity.score === 'number') {
          const currentSimuladoId = activity.id.replace('simulado-', '');
          const currentIndex = simuladosOnly.findIndex(sp => sp.id === currentSimuladoId);
          if (currentIndex > 0) {
            const previousSimulado = simuladosOnly[currentIndex - 1];
            if (typeof previousSimulado?.pontuacao === 'number') {
              activity.improvement = activity.score - previousSimulado.pontuacao;
            }
          }
        }
      }
    }

    const limit = options?.limit ?? 10;
    return activities.slice(0, limit);
  }

  private calculateActiveDays(
    simulados: Array<{ concluido_em: string | null }>,
    questoes: Array<{ criado_em: string }>,
    flashcards: Array<{ atualizado_em: string }>,
  ): number {
    const dates = new Set<string>();
    simulados.forEach(s => { if (s.concluido_em) dates.add(new Date(s.concluido_em).toDateString()); });
    questoes.forEach(q => { dates.add(new Date(q.criado_em).toDateString()); });
    flashcards.forEach(f => { dates.add(new Date(f.atualizado_em).toDateString()); });
    return dates.size;
  }

  private getIsoDate(date: Date): string {
    const iso = date.toISOString();
    const index = iso.indexOf('T');
    return index >= 0 ? iso.slice(0, index) : iso;
  }
}