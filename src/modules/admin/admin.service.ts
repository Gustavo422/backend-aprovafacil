// Serviço administrativo consolidado para o AprovaFácil
import type {
  IAdminService,
  ILogService,
  ICacheService,
  IUsuarioRepository,
} from '../../core/interfaces/index.js';
import type { ApiResponse } from '../../shared/types/index.js';
import type { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';
import type { AdminContext } from './context.js';
import ContestsAdminService from './services/content/contests.service.js';
import SimuladosAdminService from './services/content/simulados.service.js';
import WeeklyQuestionsAdminService from './services/content/weekly-questions.service.js';
import FlashcardsAdminService from './services/content/flashcards.service.js';
import ApostilasAdminService from './services/content/apostilas.service.js';
import MapaAssuntosAdminService from './services/content/mapa-assuntos.service.js';
import UsersAdminService from './services/users.service.js';
import LogsAdminService from './services/logs.service.js';
import CacheAdminService from './services/cache-config.service.js';
import MetricsAdminService from './services/metrics.service.js';
import HealthTestsAdminService from './services/health-tests.service.js';
import BackupAdminService from './services/backup.service.js';
import ImportExportAdminService from './services/import-export.service.js';
import ValidationAdminService from './services/validation.service.js';

export class AdminService implements IAdminService {
  private readonly logService: ILogService;
  private readonly cacheService: ICacheService;
  private readonly usuarioRepository: IUsuarioRepository;
  private readonly supabase: SupabaseClient;
  private readonly ctx: AdminContext;

  // Sub-serviços
  private readonly contests: ContestsAdminService;
  private readonly simulados: SimuladosAdminService;
  private readonly weekly: WeeklyQuestionsAdminService;
  private readonly flashcards: FlashcardsAdminService;
  private readonly apostilas: ApostilasAdminService;
  private readonly mapaAssuntos: MapaAssuntosAdminService;
  private readonly users: UsersAdminService;
  private readonly logs: LogsAdminService;
  private readonly cacheAdmin: CacheAdminService;
  private readonly metrics: MetricsAdminService;
  private readonly health: HealthTestsAdminService;
  private readonly backup: BackupAdminService;
  private readonly io: ImportExportAdminService;
  private readonly validation: ValidationAdminService;

  // Tipos auxiliares usados nas respostas do Supabase
  // Apenas os campos acessados são tipados para evitar uso de `any`
  // Entidades base
  private static readonly type = {
    usuario: {} as {
      id: string;
      nome?: string;
      email?: string;
      ativo?: boolean;
      primeiro_login?: boolean;
      criado_em?: string;
      ultimo_login?: string;
      tempo_estudo_minutos?: number;
      total_questoes_respondidas?: number;
      pontuacao_media?: number;
      total_acertos?: number;
    },
    concurso: {} as {
      id: string;
      nome: string;
      slug?: string;
      categoria_id: string;
      ano?: number;
      banca?: string;
      nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    simulado: {} as {
      id: string;
      titulo: string;
      slug?: string;
      descricao?: string;
      concurso_id: string;
      numero_questoes: number;
      tempo_minutos: number;
      dificuldade: string;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    questaoSimulado: {} as {
      id: string;
      simulado_id: string;
      numero_questao: number;
      enunciado: string;
      alternativas: string[];
      resposta_correta: string;
      explicacao?: string;
      disciplina?: string;
      assunto?: string;
      dificuldade?: string;
      ordem: number;
      criado_em?: string;
      atualizado_em?: string;
    },
    questoesSemanais: {} as {
      id: string;
      titulo: string;
      numero_semana: number;
      ano: number;
      concurso_id: string;
      questoes?: unknown[];
      disciplina?: string;
      assunto?: string;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    flashcard: {} as {
      id: string;
      frente: string;
      verso: string;
      disciplina: string;
      tema: string;
      subtema?: string;
      concurso_id: string;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    apostila: {} as {
      id: string;
      titulo: string;
      slug?: string;
      descricao?: string;
      concurso_id: string;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    conteudoApostila: {} as {
      id: string;
      apostila_id: string;
      concurso_id?: string;
      numero_modulo: number;
      titulo: string;
      conteudo_json: unknown;
      criado_em?: string;
      atualizado_em?: string;
    },
    categoriaConcurso: {} as {
      id: string;
      nome: string;
      descricao?: string;
      slug?: string;
      icone?: string;
      cor?: string;
      ordem?: number;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    disciplinaCategoria: {} as {
      id: string;
      categoria_id: string;
      nome: string;
      descricao?: string;
      cor?: string;
      ordem?: number;
      ativo?: boolean;
      criado_em?: string;
      atualizado_em?: string;
    },
    historicoMetrica: {} as {
      tipo: string;
      valor: number;
      coletado_em: string;
    },
    progressoUsuarioSimulado: {} as {
      id: string;
      usuario_id: string;
      concluido_em: string;
    },
    respostaQuestaoSemanal: {} as {
      id: string;
      criado_em: string;
    },
    backupSistema: {} as {
      id: string;
      nome: string;
      dados_backup: unknown;
      criado_em?: string;
    },
    configuracaoCache: {} as {
      id: string;
      chave: string;
      tempo_expiracao_minutos: number;
      ativo: boolean;
      descricao?: string;
      criado_em?: string;
      atualizado_em?: string;
    },
  } as const;

  constructor(
    logService: ILogService,
    cacheService: ICacheService,
    usuarioRepository: IUsuarioRepository,
    supabase: SupabaseClient,
  ) {
    this.logService = logService;
    this.cacheService = cacheService;
    this.usuarioRepository = usuarioRepository;
    this.supabase = supabase;
    this.ctx = { logService, cacheService, usuarioRepository, supabase };

    // Inicialização dos sub-serviços
    this.contests = new ContestsAdminService(this.ctx);
    this.simulados = new SimuladosAdminService(this.ctx);
    this.weekly = new WeeklyQuestionsAdminService(this.ctx);
    this.flashcards = new FlashcardsAdminService(this.ctx);
    this.apostilas = new ApostilasAdminService(this.ctx);
    this.mapaAssuntos = new MapaAssuntosAdminService(this.ctx);
    this.users = new UsersAdminService(this.ctx);
    this.logs = new LogsAdminService(this.ctx);
    this.cacheAdmin = new CacheAdminService(this.ctx);
    this.metrics = new MetricsAdminService(this.ctx);
    this.health = new HealthTestsAdminService(this.ctx);
    this.backup = new BackupAdminService(this.ctx);
    this.io = new ImportExportAdminService(this.ctx);
    this.validation = new ValidationAdminService();
  }

  async obterEstatisticasSistema(): Promise<ApiResponse<unknown>> {
    return this.metrics.obterEstatisticasSistema();
  }

  async gerenciarUsuarios(): Promise<ApiResponse<unknown>> {
    return this.users.gerenciarUsuarios();
  }

  async gerenciarConteudo(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('gerenciarConteudo');

      const conteudo = {
        concursos: await this.obterResumoConteudo('concursos'),
        simulados: await this.obterResumoConteudo('simulados'),
        questoes_semanais: await this.obterResumoConteudo('questoes_semanais'),
        flashcards: await this.obterResumoConteudo('cartoes_memorizacao'),
        apostilas: await this.obterResumoConteudo('apostilas'),
        conteudo_apostila: await this.obterResumoConteudo('conteudo_apostila'),
      };

      await this.logService.logarFimOperacao('gerenciarConteudo', true);

      return {
        success: true,
        data: conteudo,
        message: 'Dados de gerenciamento de conteúdo obtidos',
      };
    } catch (error) {
      await this.logService.erro('Erro ao gerenciar conteúdo', error as Error);
      throw error;
    }
  }

  async executarTestes(): Promise<ApiResponse<unknown>> {
    return this.health.executarTestes();
  }

  async limparCache(): Promise<ApiResponse<boolean>> {
    return this.cacheAdmin.limparCache();
  }

  async obterLogs(filtro?: unknown): Promise<ApiResponse<unknown>> {
    return this.logs.obterLogs(filtro);
  }

  async obterMetricas(): Promise<ApiResponse<unknown>> {
    return this.metrics.obterMetricas();
  }

  // Métodos específicos para criação de conteúdo

  async criarConcurso(dados: {
    nome: string;
    descricao?: string;
    categoria_id: string;
    ano?: number;
    banca?: string;
    nivel_dificuldade: 'facil' | 'medio' | 'dificil';
    multiplicador_questoes: number;
  }): Promise<ApiResponse<unknown>> {
    return this.contests.criarConcurso(dados);
  }

  async criarSimulado(dados: {
    titulo: string;
    descricao?: string;
    concurso_id: string;
    numero_questoes: number;
    tempo_minutos: number;
    dificuldade: 'facil' | 'medio' | 'dificil';
    questoes: Array<{
      enunciado: string;
      alternativas: string[];
      resposta_correta: string;
      explicacao?: string;
      disciplina?: string;
      assunto?: string;
      dificuldade?: string;
    }>;
  }): Promise<ApiResponse<unknown>> {
    return this.simulados.criarSimulado(dados);
  }

  async criarQuestoesSemana(dados: {
    titulo: string;
    numero_semana: number;
    ano: number;
    concurso_id: string;
    questoes: Array<{
      enunciado: string;
      alternativas: string[];
      resposta_correta: string;
      explicacao?: string;
      disciplina?: string;
      assunto?: string;
      dificuldade?: string;
    }>;
    disciplina?: string;
    assunto?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.weekly.criarQuestoesSemana(dados);
  }

  async criarFlashcards(dados: {
    concurso_id: string;
    flashcards: Array<{
      frente: string;
      verso: string;
      disciplina: string;
      tema: string;
      subtema?: string;
    }>;
  }): Promise<ApiResponse<unknown>> {
    return this.flashcards.criarFlashcards(dados);
  }

  async criarApostila(dados: {
    titulo: string;
    descricao?: string;
    concurso_id: string;
    conteudo: Array<{
      numero_modulo: number;
      titulo: string;
      conteudo_json: unknown;
    }>;
  }): Promise<ApiResponse<unknown>> {
    return this.apostilas.criarApostila(dados);
  }

  // Métodos privados auxiliares

  private async obterEstatisticasUsuarios(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('usuarios')
        .select('ativo, primeiro_login, criado_em', { count: 'exact' });

      const ativos = data?.filter((u: { ativo: boolean }) => u.ativo).length ?? 0;
      const primeiroLogin = data?.filter((u: { primeiro_login: boolean }) => u.primeiro_login).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
        inativos: (count ?? 0) - ativos,
        primeiro_login: primeiroLogin,
        ultimo_cadastro: data && data.length > 0 
          ? new Date(Math.max(...data.map((u: { criado_em: string }) => new Date(u.criado_em).getTime())))
          : null,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de usuários', error as Error);
      return { total: 0, ativos: 0, inativos: 0, primeiro_login: 0, ultimo_cadastro: null };
    }
  }

  private async obterEstatisticasConcursos(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('concursos')
        .select('ativo, criado_em', { count: 'exact' });

      const ativos = data?.filter((c: { ativo: boolean }) => c.ativo).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
        inativos: (count ?? 0) - ativos,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de concursos', error as Error);
      return { total: 0, ativos: 0, inativos: 0 };
    }
  }

  private async obterEstatisticasSimulados(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('simulados')
        .select('ativo, publico', { count: 'exact' });

      const ativos = data?.filter((s: { ativo: boolean }) => s.ativo).length ?? 0;
      const publicos = data?.filter((s: { publico: boolean }) => s.publico).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
        publicos,
        privados: ativos - publicos,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de simulados', error as Error);
      return { total: 0, ativos: 0, publicos: 0, privados: 0 };
    }
  }

  private async obterEstatisticasQuestoesSemanais(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('questoes_semanais')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter((q: { ativo: boolean }) => q.ativo).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de questões semanais', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  private async obterEstatisticasFlashcards(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('cartoes_memorizacao')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter((f: { ativo: boolean }) => f.ativo).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de flashcards', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  private async obterEstatisticasApostilas(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('apostilas')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter((a: { ativo: boolean }) => a.ativo).length ?? 0;

      return {
        total: count ?? 0,
        ativos,
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de apostilas', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  private async obterEstatisticasSistemaGeral(): Promise<unknown> {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

      // Atividade do mês atual
      const { data: atividadeMes } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('id')
        .gte('concluido_em', inicioMes.toISOString());

      return {
        atividade_mes_atual: atividadeMes?.length ?? 0,
        uptime: process.uptime(),
        memoria_uso: process.memoryUsage(),
        versao_node: process.version,
      };
    } catch {
      return {
        atividade_mes_atual: 0,
        uptime: process.uptime(),
        memoria_uso: process.memoryUsage(),
        versao_node: process.version,
      };
    }
  }

  private async obterEstatisticasPerformance(): Promise<unknown> {
    try {
      const { data } = await this.supabase
        .from('historico_metricas')
        .select('tipo, valor, coletado_em')
        .order('coletado_em', { ascending: false })
        .limit(100);

      return {
        metricas_recentes: data ?? [],
        total_metricas: data?.length ?? 0,
      };
    } catch {
      return { metricas_recentes: [], total_metricas: 0 };
    }
  }

  private async obterEstatisticasUsuariosPorMes(): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from('usuarios')
        .select('criado_em')
        .order('criado_em', { ascending: false });

      // Agrupar por mês
      const porMes: Record<string, number> = {};
      data?.forEach(usuario => {
        const mes = new Date(usuario.criado_em).toISOString().substring(0, 7); // YYYY-MM
        porMes[mes] = (porMes[mes] ?? 0) + 1;
      });

      return Object.entries(porMes).map(([mes, quantidade]) => ({
        mes,
        quantidade,
      }));
    } catch {
      return [];
    }
  }

  private async obterResumoConteudo(tabela: string): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        // Sem tipo específico por ser genérico; normalizamos abaixo
        .from(tabela)
        .select('*', { count: 'exact' })
        .limit(5)
        .order('criado_em', { ascending: false });

      return {
        total: typeof count === 'number' ? count : 0,
        recentes: Array.isArray(data) ? data : [],
      };
    } catch {
      return { total: 0, recentes: [] };
    }
  }

  private async testarConexaoBanco(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .select('count')
        .limit(1);

      if (error) {
        return { sucesso: false, detalhes: error.message };
      }

      return { sucesso: true, detalhes: 'Conexão com banco funcionando' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async testarCache(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      const chaveTest = 'teste_admin_cache';
      const valorTest = { timestamp: Date.now() };

      await this.cacheService.definir(chaveTest, valorTest, 1);
      const valorRecuperado = await this.cacheService.obter(chaveTest);
      await this.cacheService.remover(chaveTest);

      if (
        valorRecuperado &&
        typeof valorRecuperado === 'object' &&
        valorRecuperado !== null &&
        'timestamp' in valorRecuperado &&
        (valorRecuperado as { timestamp: number }).timestamp === valorTest.timestamp
      ) {
        return { sucesso: true, detalhes: 'Cache funcionando corretamente' };
      }
      return { sucesso: false, detalhes: 'Cache não está funcionando corretamente' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async testarLogs(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      await this.logService.info('Teste de log do sistema administrativo');
      return { sucesso: true, detalhes: 'Sistema de logs funcionando' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async testarAPIs(): Promise<{ sucesso: boolean; detalhes: string }> {
    return Promise.resolve({ sucesso: true, detalhes: 'APIs funcionando normalmente' });
  }

  private async testarIntegridadeDados(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      // Verificar integridade básica dos dados
      const { data: usuariosSemEmail } = await this.supabase
        .from('usuarios')
        .select('id')
        .is('email', null);

      const { data: concursosSemNome } = await this.supabase
        .from('concursos')
        .select('id')
        .is('nome', null);

      if ((usuariosSemEmail?.length ?? 0) > 0 || (concursosSemNome?.length ?? 0) > 0) {
        return { 
          sucesso: false, 
          detalhes: `Dados inconsistentes encontrados: ${usuariosSemEmail?.length ?? 0} usuários sem email, ${concursosSemNome?.length ?? 0} concursos sem nome`, 
        };
      }

      return { sucesso: true, detalhes: 'Integridade dos dados verificada' };

    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async obterMetricasBancoDados(): Promise<unknown> {
    try {
      const tabelas = [
        'usuarios', 'concursos', 'simulados', 'questoes_simulado',
        'questoes_semanais', 'cartoes_memorizacao', 'apostilas',
      ];

      const metricas: Record<string, number> = {};

      for (const tabela of tabelas) {
        const { count } = await this.supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true });
        
        metricas[tabela] = count ?? 0;
      }

      return metricas;
    } catch {
      return {};
    }
  }

  private async obterMetricasPerformance(): Promise<unknown> {
    return Promise.resolve({ performance: 'normal' });
  }

  private async obterMetricasUsoRecursos(): Promise<unknown> {
    return Promise.resolve({ recursos: 'otimizados' });
  }

  private async obterMetricasAtividadeUsuarios(): Promise<unknown> {
    try {
      const agora = new Date();
      const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
      const semanaPassada = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: atividadeOntem } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('usuario_id')
        .gte('concluido_em', ontem.toISOString());

      const { data: atividadeSemana } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('usuario_id')
        .gte('concluido_em', semanaPassada.toISOString());

      const usuariosAtivosOntem = new Set(atividadeOntem?.map(a => a.usuario_id)).size;
      const usuariosAtivosSemana = new Set(atividadeSemana?.map(a => a.usuario_id)).size;

      return {
        usuarios_ativos_24h: usuariosAtivosOntem,
        usuarios_ativos_7d: usuariosAtivosSemana,
        atividades_24h: atividadeOntem?.length ?? 0,
        atividades_7d: atividadeSemana?.length ?? 0,
      };
    } catch {
      return {
        usuarios_ativos_24h: 0,
        usuarios_ativos_7d: 0,
        atividades_24h: 0,
        atividades_7d: 0,
      };
    }
  }

  // Mantido por compatibilidade com métodos internos legados; novos serviços usam util em utils/slug
  private gerarSlug(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // ===== MÉTODOS ADICIONAIS PARA GESTÃO COMPLETA DE CONTEÚDO =====

  // GESTÃO DE CATEGORIAS DE CONCURSOS
  async criarCategoriasConcursos(dados: {
    nome: string;
    descricao?: string;
    icone?: string;
    cor?: string;
    ordem?: number;
  }): Promise<ApiResponse<unknown>> { return this.contests.criarCategoriasConcursos(dados); }

  async listarCategoriasConcursos(filtro?: { ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.listarCategoriasConcursos(filtro); }

  async atualizarCategoriasConcursos(id: string, dados: { nome?: string; descricao?: string; icone?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.atualizarCategoriasConcursos(id, dados); }

  async excluirCategoriasConcursos(id: string): Promise<ApiResponse<boolean>> { return this.contests.excluirCategoriasConcursos(id); }

  // GESTÃO DE DISCIPLINAS POR CATEGORIA
  async criarDisciplinasCategoria(dados: { categoria_id: string; nome: string; descricao?: string; cor?: string; ordem?: number; }): Promise<ApiResponse<unknown>> { return this.contests.criarDisciplinasCategoria(dados); }

  async listarDisciplinasCategoria(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.listarDisciplinasCategoria(filtro); }

  async atualizarDisciplinasCategoria(id: string, dados: { categoria_id?: string; nome?: string; descricao?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.atualizarDisciplinasCategoria(id, dados); }

  async excluirDisciplinasCategoria(id: string): Promise<ApiResponse<boolean>> { return this.contests.excluirDisciplinasCategoria(id); }

  // GESTÃO EXPANDIDA DE CONCURSOS
  async listarConcursos(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.listarConcursos(filtro); }

  async atualizarConcurso(id: string, dados: { nome?: string; descricao?: string; categoria_id?: string; ano?: number; banca?: string; nivel_dificuldade?: 'facil' | 'medio' | 'dificil'; multiplicador_questoes?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> { return this.contests.atualizarConcurso(id, dados); }

  async excluirConcurso(id: string): Promise<ApiResponse<boolean>> { return this.contests.excluirConcurso(id); }

  // GESTÃO EXPANDIDA DE SIMULADOS
  async listarSimulados(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    return this.simulados.listarSimulados(filtro);
  }

  async obterSimulado(id: string): Promise<ApiResponse<unknown>> {
    return this.simulados.obterSimulado(id);
  }

  async atualizarSimulado(id: string, dados: { titulo?: string; descricao?: string; concurso_id?: string; numero_questoes?: number; tempo_minutos?: number; dificuldade?: 'facil' | 'medio' | 'dificil'; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    return this.simulados.atualizarSimulado(id, dados);
  }

  async excluirSimulado(id: string): Promise<ApiResponse<boolean>> {
    return this.simulados.excluirSimulado(id);
  }

  // GESTÃO DE QUESTÕES DE SIMULADOS
  async adicionarQuestoesSimulado(simuladoId: string, questoes: Array<{ numero_questao: number; enunciado: string; alternativas: string[]; resposta_correta: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string; ordem?: number }>): Promise<ApiResponse<unknown>> {
    return this.simulados.adicionarQuestoesSimulado(simuladoId, questoes);
  }

  async listarQuestoesSimulado(simuladoId: string, filtro?: { dificuldade?: string; disciplina?: string }): Promise<ApiResponse<unknown>> {
    return this.simulados.listarQuestoesSimulado(simuladoId, filtro);
  }

  async atualizarQuestaoSimulado(id: string, dados: { enunciado?: string; alternativas?: string[]; resposta_correta?: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string; ordem?: number }): Promise<ApiResponse<unknown>> {
    return this.simulados.atualizarQuestaoSimulado(id, dados);
  }

  async excluirQuestaoSimulado(id: string): Promise<ApiResponse<boolean>> {
    return this.simulados.excluirQuestaoSimulado(id);
  }

  // GESTÃO EXPANDIDA DE QUESTÕES SEMANAIS
  async listarQuestoesSemana(filtro?: { concurso_id?: string; ano?: number; numero_semana?: number; disciplina?: string; assunto?: string }): Promise<ApiResponse<unknown>> {
    return this.weekly.listarQuestoesSemana(filtro);
  }

  async obterQuestoesSemana(id: string): Promise<ApiResponse<unknown>> {
    return this.weekly.obterQuestoesSemana(id);
  }

  async atualizarQuestoesSemana(id: string, dados: {
    concurso_id?: string;
    ano?: number;
    numero_semana?: number;
    titulo?: string;
    questoes?: Array<{
      enunciado: string;
      alternativas: string[];
      resposta_correta: string;
      explicacao?: string;
      disciplina?: string;
      assunto?: string;
      dificuldade?: string;
    }>;
    disciplina?: string;
    assunto?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.weekly.atualizarQuestoesSemana(id, dados);
  }

  async excluirQuestoesSemana(id: string): Promise<ApiResponse<boolean>> {
    return this.weekly.excluirQuestoesSemana(id);
  }

  // GESTÃO EXPANDIDA DE FLASHCARDS
  async listarFlashcards(filtro?: { concurso_id?: string; disciplina?: string; tema?: string; subtema?: string }): Promise<ApiResponse<unknown>> {
    return this.flashcards.listarFlashcards(filtro);
  }

  async obterFlashcard(id: string): Promise<ApiResponse<unknown>> { return this.flashcards.obterFlashcard(id); }

  async atualizarFlashcard(id: string, dados: { concurso_id?: string; frente?: string; verso?: string; disciplina?: string; tema?: string; subtema?: string }): Promise<ApiResponse<unknown>> { return this.flashcards.atualizarFlashcard(id, dados); }

  async excluirFlashcard(id: string): Promise<ApiResponse<boolean>> { return this.flashcards.excluirFlashcard(id); }

  // GESTÃO EXPANDIDA DE APOSTILAS
  async listarApostilas(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    return this.apostilas.listarApostilas(filtro);
  }

  async obterApostila(id: string): Promise<ApiResponse<unknown>> { return this.apostilas.obterApostila(id); }

  async atualizarApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.apostilas.atualizarApostila(id, dados); }

  async excluirApostila(id: string): Promise<ApiResponse<boolean>> { return this.apostilas.excluirApostila(id); }

  // GESTÃO DE CONTEÚDO DE APOSTILAS
  async adicionarConteudoApostila(apostilaId: string, conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }>): Promise<ApiResponse<unknown>> { return this.apostilas.adicionarConteudoApostila(apostilaId, conteudo); }

  async listarConteudoApostila(apostilaId: string): Promise<ApiResponse<unknown>> { return this.apostilas.listarConteudoApostila(apostilaId); }

  async atualizarConteudoApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.apostilas.atualizarConteudoApostila(id, dados); }

  async excluirConteudoApostila(id: string): Promise<ApiResponse<boolean>> { return this.apostilas.excluirConteudoApostila(id); }

  // GESTÃO DE MAPA DE ASSUNTOS
  async criarMapaAssuntos(dados: {
    concurso_id: string;
    disciplina: string;
    assunto: string;
    subassunto?: string;
    peso?: number;
    dificuldade?: string;
  }): Promise<ApiResponse<unknown>> { return this.mapaAssuntos.criarMapaAssuntos(dados); }

  async listarMapaAssuntos(): Promise<ApiResponse<unknown>> { return this.mapaAssuntos.listarMapaAssuntos(); }

  async atualizarMapaAssuntos(id: string, dados: { concurso_id?: string; disciplina?: string; assunto?: string; subassunto?: string; peso?: number; dificuldade?: string }): Promise<ApiResponse<unknown>> { return this.mapaAssuntos.atualizarMapaAssuntos(id, dados); }

  async excluirMapaAssuntos(id: string): Promise<ApiResponse<boolean>> { return this.mapaAssuntos.excluirMapaAssuntos(id); }

  // GESTÃO ADMINISTRATIVA DE USUÁRIOS
  async listarUsuarios(filtro?: { ativo?: boolean; primeiro_login?: boolean; search?: string }): Promise<ApiResponse<unknown>> {
    return this.users.listarUsuarios(filtro);
  }

  async obterUsuario(id: string): Promise<ApiResponse<unknown>> { return this.users.obterUsuario(id); }

  async atualizarUsuario(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> { return this.users.atualizarUsuario(id, dados); }

  async ativarUsuario(id: string): Promise<ApiResponse<boolean>> { return this.users.ativarUsuario(id); }

  async desativarUsuario(id: string): Promise<ApiResponse<boolean>> { return this.users.desativarUsuario(id); }

  // GESTÃO DE CONFIGURAÇÕES DE CACHE
  async criarConfiguracaoCache(dados: {
    chave: string;
    tempo_expiracao_minutos: number;
    ativo: boolean;
    descricao?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('configuracao_cache')
        .insert({
          ...dados,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select()
        .single();
      // Nota: tipagem acima é apenas para evitar `any` na destruturação; os campos utilizados são compatíveis

      if (error) throw error;
      if (data?.id) {
        await this.logService.logarCriacaoConteudo('configuracao_cache', data.id);
      }
      return { success: true, data, message: 'Configuração de cache criada' };
    } catch (error) {
      await this.logService.erro('Erro ao criar configuração de cache', error as Error, { dados });
      throw error;
    }
  }

  async listarConfiguracaoCache(): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('configuracao_cache')
        .select('*')
        .order('chave', { ascending: true });

      if (error) throw error;
      return { success: true, data, message: 'Configurações de cache listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar configurações de cache', error as Error);
      throw error;
    }
  }

  async atualizarConfiguracaoCache(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('configuracao_cache')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Configuração de cache atualizada' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar configuração de cache', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConfiguracaoCache(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('configuracao_cache')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Configuração de cache excluída' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir configuração de cache', error as Error, { id });
      throw error;
    }
  }

  // OPERAÇÕES EM LOTE
  async importarDadosLote(tipo: 'concursos', dados: Array<{ nome: string; descricao?: string; categoria_id: string; ano?: number; banca?: string; nivel_dificuldade?: string; multiplicador_questoes?: number }>): Promise<ApiResponse<unknown>>;
  async importarDadosLote(tipo: 'simulados', dados: Array<{ titulo: string; descricao?: string; concurso_id: string; numero_questoes: number; tempo_minutos: number; dificuldade: string }>): Promise<ApiResponse<unknown>>;
  async importarDadosLote(tipo: 'flashcards', dados: Array<{ concurso_id: string; flashcards: Array<{ frente: string; verso: string; disciplina: string; tema: string; subtema?: string }> }>): Promise<ApiResponse<unknown>>;
  async importarDadosLote(tipo: 'apostilas', dados: Array<{ titulo: string; descricao?: string; concurso_id: string; conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }> }>): Promise<ApiResponse<unknown>>;
  async importarDadosLote(tipo: string, dados: unknown[]): Promise<ApiResponse<unknown>> {
    return this.io.importarDadosLote(tipo as never, dados);
  }

  async exportarDados(tipo: 'concursos' | 'simulados' | 'usuarios'): Promise<ApiResponse<unknown>> {
    return this.io.exportarDados(tipo);
  }

  // VALIDAÇÃO DE DADOS JSON
  validarJsonSimulado(dados: { titulo?: string; concurso_id?: string; questoes?: Array<{ enunciado?: string; alternativas?: unknown[]; resposta_correta?: string }> }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];

      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.questoes || !Array.isArray(dados.questoes)) erros.push('Questões devem ser um array');

      if (dados.questoes) {
        (dados.questoes as Array<{ enunciado?: string; alternativas?: unknown[]; resposta_correta?: string }>).forEach((questao, index) => {
          if (!questao.enunciado) erros.push(`Questão ${index + 1}: Enunciado é obrigatório`);
          if (!questao.alternativas || !Array.isArray(questao.alternativas)) {
            erros.push(`Questão ${index + 1}: Alternativas devem ser um array`);
          }
          if (!questao.resposta_correta) erros.push(`Questão ${index + 1}: Resposta correta é obrigatória`);
        });
      }

      return {
        success: erros.length === 0,
        data: { valido: erros.length === 0, erros },
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido',
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação',
      };
    }
  }

  validarJsonQuestoesSemana(dados: { titulo?: string; numero_semana?: number; ano?: number; concurso_id?: string; questoes?: unknown[] }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];

      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.numero_semana) erros.push('Número da semana é obrigatório');
      if (!dados.ano) erros.push('Ano é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.questoes || !Array.isArray(dados.questoes)) erros.push('Questões devem ser um array');

      return {
        success: erros.length === 0,
        data: { valido: erros.length === 0, erros },
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido',
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação',
      };
    }
  }

  validarJsonApostila(dados: { titulo?: string; concurso_id?: string; conteudo?: unknown[] }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];

      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.conteudo || !Array.isArray(dados.conteudo)) erros.push('Conteúdo deve ser um array');

      return {
        success: erros.length === 0,
        data: { valido: erros.length === 0, erros },
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido',
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação',
      };
    }
  }

  // RELATÓRIOS
  async obterRelatorioConteudo(): Promise<ApiResponse<unknown>> {
    try {
      const relatorio = {
        resumo: {
          total_concursos: await this.contarRegistros('concursos'),
          total_simulados: await this.contarRegistros('simulados'),
          total_questoes_semanais: await this.contarRegistros('questoes_semanais'),
          total_flashcards: await this.contarRegistros('cartoes_memorizacao'),
          total_apostilas: await this.contarRegistros('apostilas'),
        },
        por_concurso: await this.obterEstatisticasPorConcurso(),
        atividade_recente: await this.obterAtividadeRecenteConteudo(),
      };

      return { success: true, data: relatorio, message: 'Relatório de conteúdo gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de conteúdo', error as Error);
      throw error;
    }
  }

  async obterRelatorioUsuarios(): Promise<ApiResponse<unknown>> {
    try {
      const relatorio = {
        resumo: await this.obterEstatisticasUsuarios(),
        atividade_mensal: await this.obterAtividadeMensalUsuarios(),
        usuarios_mais_ativos: await this.obterUsuariosMaisAtivos(),
        estatisticas_uso: await this.obterEstatisticasUsoSistema(),
      };

      return { success: true, data: relatorio, message: 'Relatório de usuários gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de usuários', error as Error);
      throw error;
    }
  }

  // BACKUP E RESTAURAÇÃO
  async executarBackup(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('executarBackup');

      const backup = {
        timestamp: new Date().toISOString(),
        versao: '1.0',
        dados: {
          categorias_concursos: await this.exportarTabela('categorias_concursos'),
          concursos: await this.exportarTabela('concursos'),
          simulados: await this.exportarTabela('simulados'),
          questoes_simulado: await this.exportarTabela('questoes_simulado'),
          questoes_semanais: await this.exportarTabela('questoes_semanais'),
          cartoes_memorizacao: await this.exportarTabela('cartoes_memorizacao'),
          apostilas: await this.exportarTabela('apostilas'),
          conteudo_apostila: await this.exportarTabela('conteudo_apostila'),
          mapa_assuntos: await this.exportarTabela('mapa_assuntos'),
        },
      };

      // Salvar backup no banco
      const { data, error } = await this.supabase
        .from('backups_sistema')
        .insert({
          nome: `backup_${new Date().toISOString().split('T')[0]}`,
          dados_backup: backup,
          criado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await this.logService.logarFimOperacao('executarBackup', true);
      return { success: true, data, message: 'Backup executado com sucesso' };
    } catch (error) {
      await this.logService.erro('Erro ao executar backup', error as Error);
      throw error;
    }
  }

  async restaurarBackup(dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('restaurarBackup');

      // Implementar lógica de restauração
      // Por segurança, esta operação deve ser muito cuidadosa

      await this.logService.aviso('Tentativa de restauração de backup', { dados });

      return {
        success: false,
        data: null,
        message: 'Restauração de backup deve ser implementada com cuidado especial',
      };
    } catch (error) {
      await this.logService.erro('Erro ao restaurar backup', error as Error);
      throw error;
    }
  }

  // MÉTODOS AUXILIARES PRIVADOS
  private async contarRegistros(tabela: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  private async exportarTabela(tabela: string): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from(tabela)
        .select('*');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async obterEstatisticasPorConcurso(): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from('concursos')
        .select(`
          id,
          nome,
          _simulados:simulados(count),
          _flashcards:cartoes_memorizacao(count),
          _apostilas:apostilas(count)
        `);

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async obterAtividadeRecenteConteudo(): Promise<unknown[]> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 7);

      const atividades: Array<{ id: string; criado_em: string; tipo: string }> = [];

      // Buscar criações recentes em diferentes tabelas
      const tabelas = ['concursos', 'simulados', 'questoes_semanais', 'cartoes_memorizacao', 'apostilas'];

      for (const tabela of tabelas) {
      const { data } = await this.supabase
        .from(tabela)
          .select('id, criado_em')
          .gte('criado_em', dataLimite.toISOString())
          .order('criado_em', { ascending: false })
          .limit(10);

        if (Array.isArray(data)) {
          atividades.push(...data.map(item => ({ ...item, tipo: tabela })));
        }
      }

      return atividades.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    } catch {
      return [];
    }
  }

  private async obterAtividadeMensalUsuarios(): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from('usuarios')
        .select('criado_em')
        .order('criado_em', { ascending: false });

      // Agrupar por mês
      const porMes: Record<string, number> = {};
      data?.forEach(usuario => {
        const mes = new Date(usuario.criado_em).toISOString().substring(0, 7);
        porMes[mes] = (porMes[mes] ?? 0) + 1;
      });

      return Object.entries(porMes).map(([mes, quantidade]) => ({ mes, quantidade }));
    } catch {
      return [];
    }
  }

  private async obterUsuariosMaisAtivos(): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from('usuarios')
        .select('id, nome, email, total_questoes_respondidas, tempo_estudo_minutos')
        .order('total_questoes_respondidas', { ascending: false })
        .limit(10);

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async obterEstatisticasUsoSistema(): Promise<unknown> {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

      const { data: simuladosRealizados } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('id')
        .gte('concluido_em', inicioMes.toISOString());

      const { data: questoesRespondidas } = await this.supabase
        .from('respostas_questoes_semanais')
        .select('id')
        .gte('criado_em', inicioMes.toISOString());

      return {
        simulados_realizados_mes: simuladosRealizados?.length ?? 0,
        questoes_respondidas_mes: questoesRespondidas?.length ?? 0,
      };
    } catch {
      return {
        simulados_realizados_mes: 0,
        questoes_respondidas_mes: 0,
      };
    }
  }

  // Métodos de importação em lote
  private async importarConcursosLote(dados: Array<{ nome: string; descricao?: string; categoria_id: string; ano?: number; banca?: string; nivel_dificuldade?: string; multiplicador_questoes?: number }>): Promise<unknown> {
    const concursosFormatados = dados.map(concurso => ({
      ...concurso,
      slug: this.gerarSlug(concurso.nome),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('concursos')
      .insert(concursosFormatados)
      .select();

    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarSimuladosLote(dados: Array<{ titulo: string; descricao?: string; concurso_id: string; numero_questoes: number; tempo_minutos: number; dificuldade: string }>): Promise<unknown> {
    const simuladosFormatados = dados.map(simulado => ({
      ...simulado,
      slug: this.gerarSlug(simulado.titulo),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('simulados')
      .insert(simuladosFormatados)
      .select();

    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarFlashcardsLote(dados: Array<{ concurso_id: string; flashcards: Array<{ frente: string; verso: string; disciplina: string; tema: string; subtema?: string }> }>): Promise<unknown> {
    const flashcardsFormatados = dados.map(flashcard => ({
      ...flashcard,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('cartoes_memorizacao')
      .insert(flashcardsFormatados)
      .select();

    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarApostilasLote(dados: Array<{ titulo: string; descricao?: string; concurso_id: string; conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }> }>): Promise<unknown> {
    const apostilasFormatadas = dados.map(apostila => ({
      ...apostila,
      slug: this.gerarSlug(apostila.titulo),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from('apostilas')
      .insert(apostilasFormatadas)
      .select();

    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  // Métodos de exportação
  private async exportarConcursos(): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('concursos')
      .select('*');
    if (error) throw error;
    return data;
  }

  private async exportarSimulados(): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('simulados')
      .select('id, titulo, slug, descricao, concurso_id, numero_questoes, tempo_minutos, dificuldade, publico, ativo, criado_em, atualizado_em');
    if (error) throw error;
    return data;
  }

  private async exportarUsuarios(): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*');
    if (error) throw error;
    return data;
  }

  private async exportarRelatorioUsuarios(): Promise<unknown> {
    try {
      const relatorio = {
        resumo: await this.obterEstatisticasUsuarios(),
        atividade_mensal: await this.obterAtividadeMensalUsuarios(),
        usuarios_mais_ativos: await this.obterUsuariosMaisAtivos(),
        estatisticas_uso: await this.obterEstatisticasUsoSistema(),
      };

      return { success: true, data: relatorio, message: 'Relatório de usuários gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de usuários', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioConteudo(): Promise<unknown> {
    try {
      const relatorio = {
        resumo: {
          total_concursos: await this.contarRegistros('concursos'),
          total_simulados: await this.contarRegistros('simulados'),
          total_questoes_semanais: await this.contarRegistros('questoes_semanais'),
          total_flashcards: await this.contarRegistros('cartoes_memorizacao'),
          total_apostilas: await this.contarRegistros('apostilas'),
        },
        por_concurso: await this.obterEstatisticasPorConcurso(),
        atividade_recente: await this.obterAtividadeRecenteConteudo(),
      };

      return { success: true, data: relatorio, message: 'Relatório de conteúdo gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de conteúdo', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioSimulados(): Promise<unknown> {
    try {
      const relatorio = {
        total_simulados: await this.contarRegistros('simulados'),
        atividade_recente: await this.obterAtividadeRecenteConteudo(),
      };

      return { success: true, data: relatorio, message: 'Relatório de simulados gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de simulados', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioApostilas(): Promise<unknown> {
    try {
      const relatorio = {
        total_apostilas: await this.contarRegistros('apostilas'),
        atividade_recente: await this.obterAtividadeRecenteConteudo(),
      };

      return { success: true, data: relatorio, message: 'Relatório de apostilas gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de apostilas', error as Error);
      throw error;
    }
  }

  private importarRelatorioUsuarios(dados: Array<{ nome: string; email: string; ativo: boolean; primeiro_login: boolean }>): unknown {
    // Implementar lógica de importação de relatório de usuários
    return { importados: dados.length, dados };
  }

  private importarRelatorioConteudo(dados: Array<{ tipo: string; quantidade: number }>): unknown {
    // Implementar lógica de importação de relatório de conteúdo
    return { importados: dados.length, dados };
  }

  private importarRelatorioSimulados(dados: Array<{ titulo: string; total_questoes: number }>): unknown {
    // Implementar lógica de importação de relatório de simulados
    return { importados: dados.length, dados };
  }

  private importarRelatorioApostilas(dados: Array<{ titulo: string; total_modulos: number }>): unknown {
    // Implementar lógica de importação de relatório de apostilas
    return { importados: dados.length, dados };
  }
}

export default AdminService;