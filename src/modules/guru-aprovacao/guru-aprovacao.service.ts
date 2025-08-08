// Serviço do Guru da Aprovação para o AprovaFácil
import type { 
  IGuruAprovacaoService, 
  IUsuarioRepository, 
  ILogService, 
  ICacheService, 
} from '../../core/interfaces/index.js';
import type { 
  MetricasGuruAprovacao, 
  ApiResponse, 
} from '../../shared/types/index.js';
import { UsuarioNaoEncontradoError } from '../../core/errors/usuario-errors.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export class GuruAprovacaoService implements IGuruAprovacaoService {
  private readonly usuarioRepository: IUsuarioRepository;
  private readonly logService: ILogService;
  private readonly cacheService: ICacheService;
  private readonly supabase: SupabaseClient;

  constructor(
    usuarioRepository: IUsuarioRepository,
    logService: ILogService,
    cacheService: ICacheService,
    supabase: SupabaseClient,
  ) {
    this.usuarioRepository = usuarioRepository;
    this.logService = logService;
    this.cacheService = cacheService;
    this.supabase = supabase;
  }

  async calcularMetricas(usuarioId: string): Promise<ApiResponse<MetricasGuruAprovacao>> {
    try {
      await this.logService.logarInicioOperacao('calcularMetricasGuru', { usuarioId });

      // Verificar cache primeiro
      const chaveCache = `guru_metricas_${usuarioId}`;
      const metricasCache = await this.cacheService.obter<MetricasGuruAprovacao>(chaveCache);
      
      if (metricasCache) {
        await this.logService.debug('Métricas do Guru encontradas no cache', { usuarioId });
        return {
          success: true,
          data: metricasCache,
          message: 'Métricas calculadas',
        };
      }

      // Verificar se usuário existe
      const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
      if (!usuario) {
        throw new UsuarioNaoEncontradoError(usuarioId);
      }

      // Obter concurso do usuário
      const concursoUsuario = await this.obterConcursoUsuario(usuarioId);
      if (!concursoUsuario) {
        throw new Error('Usuário deve selecionar um concurso primeiro');
      }

      // Calcular métricas
      const questoesRespondidas = await this.calcularQuestoesRespondidas(usuarioId);
      const metaQuestoes = this.calcularMetaQuestoes(concursoUsuario.multiplicador_questoes);
      const percentualQuestoes = Math.min((questoesRespondidas / metaQuestoes) * 100, 100);

      const proficienciaFlashcards = await this.calcularProficienciaFlashcards(usuarioId);
      const progressoApostilas = await this.calcularProgressoApostilas(usuarioId);
      const consistenciaEstudo = await this.calcularConsistenciaEstudo(usuarioId);

      // Calcular pontuação geral (média ponderada)
      const pontuacaoGeral = this.calcularPontuacaoGeral({
        percentualQuestoes,
        proficienciaFlashcards,
        progressoApostilas,
        consistenciaEstudo,
      });

      // Calcular distância da aprovação
      const distanciaAprovacao = Math.max(0, 100 - pontuacaoGeral);

      // Estimar tempo para aprovação
      const tempoEstimadoAprovacao = this.estimarTempoAprovacao(
        pontuacaoGeral,
        consistenciaEstudo,
        concursoUsuario.nivel_dificuldade,
      );

      const metricas: MetricasGuruAprovacao = {
        questoes_respondidas: questoesRespondidas,
        meta_questoes: metaQuestoes,
        percentual_questoes: Math.round(percentualQuestoes * 100) / 100,
        proficiencia_flashcards: Math.round(proficienciaFlashcards * 100) / 100,
        progresso_apostilas: Math.round(progressoApostilas * 100) / 100,
        consistencia_estudo: Math.round(consistenciaEstudo * 100) / 100,
        pontuacao_geral: Math.round(pontuacaoGeral * 100) / 100,
        distancia_aprovacao: Math.round(distanciaAprovacao * 100) / 100,
        tempo_estimado_aprovacao: tempoEstimadoAprovacao,
      };

      // Salvar no cache por 30 minutos
      await this.cacheService.definir(chaveCache, metricas, 30);

      await this.logService.logarFimOperacao('calcularMetricasGuru', true);

      return {
        success: true,
        data: metricas,
        message: 'Métricas calculadas com sucesso',
      };
    } catch (error) {
      await this.logService.erro('Erro ao calcular métricas do Guru', error as Error, { usuarioId });
      throw error;
    }
  }

  async obterPrognostico(usuarioId: string): Promise<ApiResponse<{
    distancia_aprovacao: number;
    tempo_estimado: string;
    recomendacoes: string[];
  }>> {
    try {
      await this.logService.logarInicioOperacao('obterPrognosticoGuru', { usuarioId });

      const metricasResponse = await this.calcularMetricas(usuarioId);
      const metricas = metricasResponse.data;

      if (!metricas) {
        throw new Error('Não foi possível calcular as métricas');
      }

      // Gerar recomendações baseadas nas métricas
      const recomendacoes = this.gerarRecomendacoes(metricas);

      const prognostico = {
        distancia_aprovacao: metricas.distancia_aprovacao,
        tempo_estimado: metricas.tempo_estimado_aprovacao,
        recomendacoes,
      };

      await this.logService.logarFimOperacao('obterPrognosticoGuru', true);

      return {
        success: true,
        data: prognostico,
        message: 'Prognóstico gerado com sucesso',
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter prognóstico do Guru', error as Error, { usuarioId });
      throw error;
    }
  }

  async atualizarMetricas(usuarioId: string): Promise<void> {
    try {
      await this.logService.logarInicioOperacao('atualizarMetricasGuru', { usuarioId });

      // Limpar cache para forçar recálculo
      const chaveCache = `guru_metricas_${usuarioId}`;
      await this.cacheService.remover(chaveCache);

      // Recalcular métricas
      await this.calcularMetricas(usuarioId);

      await this.logService.info('Métricas do Guru atualizadas', { usuarioId });
      await this.logService.logarFimOperacao('atualizarMetricasGuru', true);
    } catch (error) {
      await this.logService.erro('Erro ao atualizar métricas do Guru', error as Error, { usuarioId });
      throw error;
    }
  }

  // Métodos privados para cálculos específicos

  private async obterConcursoUsuario(usuarioId: string): Promise<{
    id: string;
    nome: string;
    nivel_dificuldade: string;
    multiplicador_questoes: number;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('preferencias_usuario_concurso')
        .select(`
          concurso_id,
          concursos (
            id,
            nome,
            nivel_dificuldade,
            multiplicador_questoes
          )
        `)
        .eq('usuario_id', usuarioId)
        .eq('ativo', true)
        .single();

      if (error || !data || typeof data.concursos !== 'object' || data.concursos === null) {
        return null;
      }

      // data.concursos pode ser um objeto ou um array (dependendo do relacionomento)
      const concurso = Array.isArray(data.concursos) ? data.concursos[0] : data.concursos;
      if (!concurso) {
        return null;
      }

      return {
        id: String(concurso.id),
        nome: String(concurso.nome),
        nivel_dificuldade: String(concurso.nivel_dificuldade),
        multiplicador_questoes: Number(concurso.multiplicador_questoes),
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter concurso do usuário', error as Error, { usuarioId });
      return null;
    }
  }

  private async calcularQuestoesRespondidas(usuarioId: string): Promise<number> {
    try {
      // Questões de simulados
      const { data: simuladosData } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('respostas')
        .eq('usuario_id', usuarioId);

      let questoesSimulados = 0;
      if (simuladosData) {
        questoesSimulados = simuladosData.reduce((total, progresso) => {
          const respostas = progresso.respostas ?? {};
          return total + Object.keys(respostas).length;
        }, 0);
      }

      // Questões semanais
      const { data: semanaisData } = await this.supabase
        .from('respostas_questoes_semanais')
        .select('id')
        .eq('usuario_id', usuarioId);

      const questoesSemanais = semanaisData?.length ?? 0;

      return questoesSimulados + questoesSemanais;
    } catch (error) {
      await this.logService.erro('Erro ao calcular questões respondidas', error as Error, { usuarioId });
      return 0;
    }
  }

  private calcularMetaQuestoes(multiplicador: number): number {
    const metaBase = 5000; // Meta base de 5000 questões
    return Math.round(metaBase * multiplicador);
  }

  private async calcularProficienciaFlashcards(usuarioId: string): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('progresso_usuario_flashcard')
        .select('status')
        .eq('usuario_id', usuarioId);

      if (!data || data.length === 0) {
        return 0;
      }

      const totalFlashcards = data.length;
      const dominados = data.filter(f => f.status === 'dominado').length;
      const revisando = data.filter(f => f.status === 'revisando').length;
      const aprendendo = data.filter(f => f.status === 'aprendendo').length;

      // Pontuação ponderada: dominado = 100%, revisando = 70%, aprendendo = 40%
      const pontuacao = (dominados * 100 + revisando * 70 + aprendendo * 40) / totalFlashcards;
      
      return Math.min(pontuacao, 100);
    } catch (error) {
      await this.logService.erro('Erro ao calcular proficiência em flashcards', error as Error, { usuarioId });
      return 0;
    }
  }

  private async calcularProgressoApostilas(usuarioId: string): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('progresso_usuario_apostila')
        .select('percentual_progresso, concluido')
        .eq('usuario_id', usuarioId);

      if (!data || data.length === 0) {
        return 0;
      }

      const progressoTotal = data.reduce((total, progresso) => {
        return total + (progresso.percentual_progresso ?? 0);
      }, 0);

      return Math.min(progressoTotal / data.length, 100);
    } catch (error) {
      await this.logService.erro('Erro ao calcular progresso em apostilas', error as Error, { usuarioId });
      return 0;
    }
  }

  private async calcularConsistenciaEstudo(usuarioId: string): Promise<number> {
    try {
      // Buscar atividades dos últimos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data: simuladosData } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('concluido_em')
        .eq('usuario_id', usuarioId)
        .gte('concluido_em', dataLimite.toISOString());

      const { data: semanaisData } = await this.supabase
        .from('respostas_questoes_semanais')
        .select('criado_em')
        .eq('usuario_id', usuarioId)
        .gte('criado_em', dataLimite.toISOString());

      // Agrupar atividades por dia
      const diasComAtividade = new Set();
      
      simuladosData?.forEach(item => {
        if (item.concluido_em) {
          const dia = new Date(item.concluido_em).toDateString();
          diasComAtividade.add(dia);
        }
      });

      semanaisData?.forEach(item => {
        if (item.criado_em) {
          const dia = new Date(item.criado_em).toDateString();
          diasComAtividade.add(dia);
        }
      });

      // Calcular consistência (dias com atividade / 30 dias)
      const consistencia = (diasComAtividade.size / 30) * 100;
      
      return Math.min(consistencia, 100);
    } catch (error) {
      await this.logService.erro('Erro ao calcular consistência de estudo', error as Error, { usuarioId });
      return 0;
    }
  }

  private calcularPontuacaoGeral(metricas: {
    percentualQuestoes: number;
    proficienciaFlashcards: number;
    progressoApostilas: number;
    consistenciaEstudo: number;
  }): number {
    // Pesos para cada métrica
    const pesos = {
      questoes: 0.4, // 40% - Questões são o mais importante
      flashcards: 0.25, // 25% - Memorização é crucial
      apostilas: 0.2, // 20% - Conhecimento teórico
      consistencia: 0.15, // 15% - Regularidade nos estudos
    };

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
    // Fatores de ajuste baseados no nível de dificuldade
    const fatoresDificuldade = {
      'facil': 0.8,
      'medio': 1.0,
      'dificil': 1.3,
    };

          const fatorDificuldade = fatoresDificuldade[nivelDificuldade as keyof typeof fatoresDificuldade] ?? 1.0;

    // Calcular tempo base em semanas
    let tempoBaseSemanas: number;
    
    if (pontuacaoGeral >= 80) {
      tempoBaseSemanas = 4; // 1 mês
    } else if (pontuacaoGeral >= 60) {
      tempoBaseSemanas = 12; // 3 meses
    } else if (pontuacaoGeral >= 40) {
      tempoBaseSemanas = 24; // 6 meses
    } else if (pontuacaoGeral >= 20) {
      tempoBaseSemanas = 48; // 12 meses
    } else {
      tempoBaseSemanas = 72; // 18 meses
    }

    // Ajustar baseado na consistência
    const fatorConsistencia = consistenciaEstudo > 50 ? 0.9 : 1.2;

    // Calcular tempo final
    const tempoFinalSemanas = Math.round(tempoBaseSemanas * fatorDificuldade * fatorConsistencia);

    // Converter para formato legível
    if (tempoFinalSemanas <= 4) {
      return `${tempoFinalSemanas} semanas`;
    } else if (tempoFinalSemanas <= 52) {
      const meses = Math.round(tempoFinalSemanas / 4);
      return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    } 
      const anos = Math.round(tempoFinalSemanas / 52);
      return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    
  }

  private gerarRecomendacoes(metricas: MetricasGuruAprovacao): string[] {
    const recomendacoes: string[] = [];

    // Recomendações baseadas em questões
    if (metricas.percentual_questoes < 30) {
      recomendacoes.push('Foque em resolver mais questões. Você está abaixo da meta necessária.');
      recomendacoes.push('Dedique pelo menos 2 horas diárias para resolução de questões.');
    } else if (metricas.percentual_questoes < 60) {
      recomendacoes.push('Continue resolvendo questões regularmente. Você está no caminho certo!');
    } else {
      recomendacoes.push('Excelente progresso em questões! Mantenha o ritmo.');
    }

    // Recomendações baseadas em flashcards
    if (metricas.proficiencia_flashcards < 40) {
      recomendacoes.push('Dedique mais tempo aos flashcards para melhorar a memorização.');
      recomendacoes.push('Revise os flashcards diariamente, mesmo que por poucos minutos.');
    } else if (metricas.proficiencia_flashcards < 70) {
      recomendacoes.push('Bom progresso nos flashcards. Continue revisando regularmente.');
    }

    // Recomendações baseadas em apostilas
    if (metricas.progresso_apostilas < 50) {
      recomendacoes.push('Aumente o tempo dedicado ao estudo teórico das apostilas.');
      recomendacoes.push('Estabeleça metas diárias de leitura para acelerar o progresso.');
    }

    // Recomendações baseadas em consistência
    if (metricas.consistencia_estudo < 50) {
      recomendacoes.push('Melhore a consistência dos estudos. Estude um pouco todos os dias.');
      recomendacoes.push('Crie uma rotina de estudos e siga-a rigorosamente.');
    } else if (metricas.consistencia_estudo < 80) {
      recomendacoes.push('Boa consistência! Tente manter a regularidade nos estudos.');
    }

    // Recomendações gerais baseadas na pontuação
    if (metricas.pontuacao_geral < 40) {
      recomendacoes.push('Você está no início da jornada. Foque em criar uma rotina sólida de estudos.');
      recomendacoes.push('Considere revisar seu plano de estudos para otimizar o tempo.');
    } else if (metricas.pontuacao_geral < 70) {
      recomendacoes.push('Progresso satisfatório! Continue focado e disciplinado.');
      recomendacoes.push('Identifique suas matérias mais fracas e dedique mais tempo a elas.');
    } else {
      recomendacoes.push('Excelente progresso! Você está muito próximo da aprovação.');
      recomendacoes.push('Mantenha o foco e a disciplina até o dia da prova.');
    }

    return recomendacoes.slice(0, 5); // Limitar a 5 recomendações
  }

  // Métodos para análises específicas

  async obterAnaliseDetalhada(usuarioId: string): Promise<ApiResponse<{
    metricas: MetricasGuruAprovacao;
    analise_por_disciplina: unknown[];
    evolucao_temporal: unknown[];
    pontos_fortes: string[];
    pontos_fracos: string[];
  }>> {
    try {
      const metricasResponse = await this.calcularMetricas(usuarioId);
      const metricas = metricasResponse.data;

      if (!metricas) {
        throw new Error('Não foi possível calcular as métricas');
      }

      const analisePorDisciplina = await this.analisarDesempenhoPorDisciplina(usuarioId);
      const evolucaoTemporal = await this.obterEvolucaoTemporal(usuarioId);
      const pontosFortes = this.identificarPontosFortes(metricas);
      const pontosFracos = this.identificarPontosFracos(metricas);

      return {
        success: true,
        data: {
          metricas,
          analise_por_disciplina: analisePorDisciplina,
          evolucao_temporal: evolucaoTemporal,
          pontos_fortes: pontosFortes,
          pontos_fracos: pontosFracos,
        },
        message: 'Análise detalhada gerada',
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter análise detalhada', error as Error, { usuarioId });
      throw error;
    }
  }

  private async analisarDesempenhoPorDisciplina(usuarioId: string): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from('estatisticas_usuario_disciplina')
        .select('*')
        .eq('usuario_id', usuarioId);

      return data ?? [];
    } catch (error) {
      await this.logService.erro('Erro ao analisar desempenho por disciplina', error as Error, { usuarioId });
      return [];
    }
  }

  private async obterEvolucaoTemporal(usuarioId: string): Promise<unknown[]> {
    try {
      // Buscar progresso dos últimos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('pontuacao, concluido_em')
        .eq('usuario_id', usuarioId)
        .gte('concluido_em', dataLimite.toISOString())
        .order('concluido_em', { ascending: true });

      return data ?? [];
    } catch (error) {
      await this.logService.erro('Erro ao obter evolução temporal', error as Error, { usuarioId });
      return [];
    }
  }

  private identificarPontosFortes(metricas: MetricasGuruAprovacao): string[] {
    const pontos: string[] = [];

    if (metricas.percentual_questoes >= 70) {
      pontos.push('Excelente progresso em resolução de questões');
    }

    if (metricas.proficiencia_flashcards >= 70) {
      pontos.push('Boa proficiência em memorização');
    }

    if (metricas.progresso_apostilas >= 70) {
      pontos.push('Bom progresso no estudo teórico');
    }

    if (metricas.consistencia_estudo >= 70) {
      pontos.push('Excelente consistência nos estudos');
    }

    if (pontos.length === 0) {
      pontos.push('Continue se esforçando, você está no caminho certo!');
    }

    return pontos;
  }

  private identificarPontosFracos(metricas: MetricasGuruAprovacao): string[] {
    const pontos: string[] = [];

    if (metricas.percentual_questoes < 50) {
      pontos.push('Precisa resolver mais questões');
    }

    if (metricas.proficiencia_flashcards < 50) {
      pontos.push('Precisa melhorar a memorização');
    }

    if (metricas.progresso_apostilas < 50) {
      pontos.push('Precisa dedicar mais tempo ao estudo teórico');
    }

    if (metricas.consistencia_estudo < 50) {
      pontos.push('Precisa ser mais consistente nos estudos');
    }

    return pontos;
  }
}

export default GuruAprovacaoService;




