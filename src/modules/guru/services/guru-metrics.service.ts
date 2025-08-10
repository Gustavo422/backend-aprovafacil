import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICacheService, ILogService } from '../../../core/interfaces/index.js';
import type { MetricasGuruAprovacao, ApiResponse } from '../../../shared/types/index.js';
import { GuruMetricsRepository, type IGuruMetricsRepository } from '../repositories/metrics.repository.js';

export class GuruMetricsService {
  private readonly repo: IGuruMetricsRepository;
  private readonly cache: ICacheService;
  private readonly log: ILogService;

  constructor(supabase: SupabaseClient, cache: ICacheService, log: ILogService) {
    this.repo = new GuruMetricsRepository(supabase);
    this.cache = cache;
    this.log = log;
  }

  async calcularMetricas(usuarioId: string): Promise<ApiResponse<MetricasGuruAprovacao>> {
    await this.log.logarInicioOperacao('guru.calcularMetricas', { usuarioId });

    const cacheKey = `guru:metricas:${usuarioId}`;
    const cached = await this.cache.obter<MetricasGuruAprovacao>(cacheKey);
    if (cached) {
      await this.log.debug('guru.metricas cache hit', { usuarioId });
      return { success: true, data: cached, message: 'Métricas calculadas' };
    }

    const concursoInfo = await this.repo.getPreferredConcursoInfo(usuarioId);
    if (!concursoInfo) {
      throw new Error('Usuário deve selecionar um concurso primeiro');
    }

    const [simuladoRespostas, questoesSemanais, flashcards, apostilas] = await Promise.all([
      this.repo.fetchSimuladoRespostas(usuarioId),
      this.repo.fetchQuestoesSemanaisIds(usuarioId),
      this.repo.fetchFlashcardsStatus(usuarioId),
      this.repo.fetchApostilasProgresso(usuarioId),
    ]);

    const questoesRespondidas = (simuladoRespostas ?? []).reduce((total, prog) => {
      const respostas = prog.respostas ?? {};
      return total + Object.keys(respostas).length;
    }, 0) + (questoesSemanais?.length ?? 0);

    const metaQuestoes = this.calcularMetaQuestoes(concursoInfo.multiplicador_questoes);
    const percentualQuestoes = Math.min((questoesRespondidas / metaQuestoes) * 100, 100);

    const proficienciaFlashcards = this.calcularProficienciaFlashcards(flashcards.map(f => f.status));
    const progressoApostilas = this.calcularProgressoApostilas(apostilas.map(a => a.percentual_progresso));
    const consistenciaEstudo = await this.calcularConsistenciaEstudo(usuarioId);

    const pontuacaoGeral = this.calcularPontuacaoGeral({
      percentualQuestoes,
      proficienciaFlashcards,
      progressoApostilas,
      consistenciaEstudo,
    });

    const distanciaAprovacao = Math.max(0, 100 - pontuacaoGeral);
    const tempoEstimadoAprovacao = this.estimarTempoAprovacao(
      pontuacaoGeral,
      consistenciaEstudo,
      concursoInfo.nivel_dificuldade,
    );

    const metricas: MetricasGuruAprovacao = {
      questoes_respondidas: questoesRespondidas,
      meta_questoes: metaQuestoes,
      percentual_questoes: this.round2(percentualQuestoes),
      proficiencia_flashcards: this.round2(proficienciaFlashcards),
      progresso_apostilas: this.round2(progressoApostilas),
      consistencia_estudo: this.round2(consistenciaEstudo),
      pontuacao_geral: this.round2(pontuacaoGeral),
      distancia_aprovacao: this.round2(distanciaAprovacao),
      tempo_estimado_aprovacao: tempoEstimadoAprovacao,
    };

    await this.cache.definir(cacheKey, metricas, 30);
    await this.log.logarFimOperacao('guru.calcularMetricas', true);
    return { success: true, data: metricas, message: 'Métricas calculadas com sucesso' };
  }

  private async calcularConsistenciaEstudo(usuarioId: string): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    const iso = dataLimite.toISOString();
    const [simulados, semanais] = await Promise.all([
      this.repo.fetchSimuladosConcluidoEmDesde(usuarioId, iso),
      this.repo.fetchQuestoesSemanaisCriadoEmDesde(usuarioId, iso),
    ]);

    const dias = new Set<string>();
    simulados?.forEach(s => { if (s.concluido_em) dias.add(new Date(s.concluido_em).toDateString()); });
    semanais?.forEach(q => { dias.add(new Date(q.criado_em).toDateString()); });
    return Math.min((dias.size / 30) * 100, 100);
  }

  private calcularProficienciaFlashcards(statusList: string[]): number {
    if (!statusList.length) return 0;
    const dominados = statusList.filter(s => s === 'dominado').length;
    const revisando = statusList.filter(s => s === 'revisando').length;
    const aprendendo = statusList.filter(s => s === 'aprendendo').length;
    const total = statusList.length;
    const pontuacao = (dominados * 100 + revisando * 70 + aprendendo * 40) / total;
    return Math.min(pontuacao, 100);
  }

  private calcularProgressoApostilas(percentuais: Array<number | null>): number {
    if (!percentuais.length) return 0;
    const soma = percentuais.reduce<number>((acc, v) => acc + (v ?? 0), 0);
    return Math.min(soma / percentuais.length, 100);
  }

  private calcularMetaQuestoes(multiplicador: number): number {
    const metaBase = 5000;
    return Math.round(metaBase * multiplicador);
  }

  private calcularPontuacaoGeral(metricas: {
    percentualQuestoes: number;
    proficienciaFlashcards: number;
    progressoApostilas: number;
    consistenciaEstudo: number;
  }): number {
    const pesos = {
      questoes: 0.4,
      flashcards: 0.25,
      apostilas: 0.2,
      consistencia: 0.15,
    } as const;

    const pontuacao =
      (metricas.percentualQuestoes * pesos.questoes) +
      (metricas.proficienciaFlashcards * pesos.flashcards) +
      (metricas.progressoApostilas * pesos.apostilas) +
      (metricas.consistenciaEstudo * pesos.consistencia);
    return Math.min(pontuacao, 100);
  }

  private estimarTempoAprovacao(
    pontuacaoGeral: number,
    consistenciaEstudo: number,
    nivelDificuldade: string,
  ): string {
    const fatoresDificuldade: Record<string, number> = {
      facil: 0.8,
      medio: 1.0,
      dificil: 1.3,
    };
    const fatorDificuldade = fatoresDificuldade[nivelDificuldade] ?? 1.0;

    let semanas: number;
    if (pontuacaoGeral >= 80) semanas = 4;
    else if (pontuacaoGeral >= 60) semanas = 12;
    else if (pontuacaoGeral >= 40) semanas = 24;
    else if (pontuacaoGeral >= 20) semanas = 48;
    else semanas = 72;

    const fatorConsistencia = consistenciaEstudo > 50 ? 0.9 : 1.2;
    const totalSemanas = Math.round(semanas * fatorDificuldade * fatorConsistencia);
    if (totalSemanas <= 4) return `${totalSemanas} semanas`;
    if (totalSemanas <= 52) {
      const meses = Math.round(totalSemanas / 4);
      return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    }
    const anos = Math.round(totalSemanas / 52);
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}


