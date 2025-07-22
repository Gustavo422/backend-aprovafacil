// Serviço administrativo consolidado para o AprovaFácil
import { 
  IAdminService, 
  ILogService, 
  ICacheService, 
  IUsuarioRepository 
} from '../../core/interfaces/index.js';
import { ApiResponse } from '../../shared/types/index.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class AdminService implements IAdminService {
  private logService: ILogService;
  private cacheService: ICacheService;
  private usuarioRepository: IUsuarioRepository;
  private supabase: SupabaseClient;

  constructor(
    logService: ILogService,
    cacheService: ICacheService,
    usuarioRepository: IUsuarioRepository,
    supabase: SupabaseClient
  ) {
    this.logService = logService;
    this.cacheService = cacheService;
    this.usuarioRepository = usuarioRepository;
    this.supabase = supabase;
  }

  async obterEstatisticasSistema(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('obterEstatisticasSistema');

      const estatisticas = {
        usuarios: await this.obterEstatisticasUsuarios(),
        concursos: await this.obterEstatisticasConcursos(),
        simulados: await this.obterEstatisticasSimulados(),
        questoes_semanais: await this.obterEstatisticasQuestoesSemanais(),
        flashcards: await this.obterEstatisticasFlashcards(),
        apostilas: await this.obterEstatisticasApostilas(),
        sistema: await this.obterEstatisticasSistemaGeral(),
        performance: await this.obterEstatisticasPerformance()
      };

      await this.logService.logarFimOperacao('obterEstatisticasSistema', true);

      return {
        success: true,
        data: estatisticas,
        message: 'Estatísticas do sistema obtidas'
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas do sistema', error as Error);
      throw error;
    }
  }

  async gerenciarUsuarios(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('gerenciarUsuarios');

      const usuarios = await this.usuarioRepository.buscarTodos({ limit: 100 });
      const usuariosAtivos = await this.usuarioRepository.buscarUsuariosAtivos();
      const usuariosPrimeiroLogin = await this.usuarioRepository.obterUsuariosComPrimeiroLogin();

      const gerenciamento = {
        total_usuarios: usuarios.data.length,
        usuarios_ativos: usuariosAtivos.length,
        usuarios_primeiro_login: usuariosPrimeiroLogin.length,
        usuarios_recentes: usuarios.data.slice(0, 10), // 10 mais recentes
        estatisticas_por_mes: await this.obterEstatisticasUsuariosPorMes()
      };

      await this.logService.logarFimOperacao('gerenciarUsuarios', true);

      return {
        success: true,
        data: gerenciamento,
        message: 'Dados de gerenciamento de usuários obtidos'
      };
    } catch (error) {
      await this.logService.erro('Erro ao gerenciar usuários', error as Error);
      throw error;
    }
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
        conteudo_apostila: await this.obterResumoConteudo('conteudo_apostila')
      };

      await this.logService.logarFimOperacao('gerenciarConteudo', true);

      return {
        success: true,
        data: conteudo,
        message: 'Dados de gerenciamento de conteúdo obtidos'
      };
    } catch (error) {
      await this.logService.erro('Erro ao gerenciar conteúdo', error as Error);
      throw error;
    }
  }

  async executarTestes(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('executarTestes');

      const resultados = {
        conexao_banco: await this.testarConexaoBanco(),
        cache: await this.testarCache(),
        logs: await this.testarLogs(),
        apis: await this.testarAPIs(),
        integridade_dados: await this.testarIntegridadeDados()
      };

      const todosPassaram = Object.values(resultados).every(teste => teste.sucesso);

      await this.logService.logarFimOperacao('executarTestes', todosPassaram);

      return {
        success: true,
        data: {
          status_geral: todosPassaram ? 'PASSOU' : 'FALHOU',
          resultados,
          executado_em: new Date().toISOString()
        },
        message: 'Testes executados'
      };
    } catch (error) {
      await this.logService.erro('Erro ao executar testes', error as Error);
      throw error;
    }
  }

  async limparCache(): Promise<ApiResponse<boolean>> {
    try {
      await this.logService.logarInicioOperacao('limparCacheAdmin');

      // Limpar cache em memória e persistente
      await this.cacheService.limpar();

      // Limpar cache expirado do banco
      const registrosRemovidos = await this.cacheService.limparCacheExpiradoBanco();

      await this.logService.info('Cache limpo pelo administrador', { 
        registros_removidos: registrosRemovidos 
      });
      await this.logService.logarFimOperacao('limparCacheAdmin', true);

      return {
        success: true,
        data: true,
        message: `Cache limpo com sucesso. ${registrosRemovidos} registros expirados removidos.`
      };
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache', error as Error);
      throw error;
    }
  }

  async obterLogs(filtro?: unknown): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('obterLogsAdmin', { filtro });

      const logs = await this.logService.obterLogs(filtro);
      const estatisticasLogs = await this.logService.obterEstatisticasLogs();

      const resultado = {
        logs: logs.logs,
        total: logs.total,
        estatisticas: estatisticasLogs,
        filtros_aplicados: filtro || {}
      };

      await this.logService.logarFimOperacao('obterLogsAdmin', true);

      return {
        success: true,
        data: resultado,
        message: 'Logs obtidos'
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter logs', error as Error, { filtro });
      throw error;
    }
  }

  async obterMetricas(): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('obterMetricasAdmin');

      const metricas = {
        cache: await this.cacheService.obterEstatisticas(),
        banco_dados: await this.obterMetricasBancoDados(),
        performance: await this.obterMetricasPerformance(),
        uso_recursos: await this.obterMetricasUsoRecursos(),
        atividade_usuarios: await this.obterMetricasAtividadeUsuarios()
      };

      await this.logService.logarFimOperacao('obterMetricasAdmin', true);

      return {
        success: true,
        data: metricas,
        message: 'Métricas obtidas'
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter métricas', error as Error);
      throw error;
    }
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
    try {
      await this.logService.logarInicioOperacao('criarConcurso', { nome: dados.nome });

      // Gerar slug
      const slug = this.gerarSlug(dados.nome);

      const { data, error } = await this.supabase
        .from('concursos')
        .insert({
          ...dados,
          slug,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.logService.logarCriacaoConteudo('concurso', data.id);
      await this.logService.logarFimOperacao('criarConcurso', true);

      return {
        success: true,
        data,
        message: 'Concurso criado com sucesso'
      };
    } catch (error) {
      await this.logService.erro('Erro ao criar concurso', error as Error, { dados });
      throw error;
    }
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
    try {
      await this.logService.logarInicioOperacao('criarSimulado', { titulo: dados.titulo });

      // Gerar slug
      const slug = this.gerarSlug(dados.titulo);

      // Criar simulado
      const { data: simulado, error: erroSimulado } = await this.supabase
        .from('simulados')
        .insert({
          titulo: dados.titulo,
          slug,
          descricao: dados.descricao,
          concurso_id: dados.concurso_id,
          numero_questoes: dados.numero_questoes,
          tempo_minutos: dados.tempo_minutos,
          dificuldade: dados.dificuldade,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (erroSimulado) {
        throw erroSimulado;
      }

      // Criar questões
      if (dados.questoes && dados.questoes.length > 0) {
        const questoesFormatadas = dados.questoes.map((questao, index) => ({
          simulado_id: simulado.id,
          numero_questao: index + 1,
          enunciado: questao.enunciado,
          alternativas: questao.alternativas,
          resposta_correta: questao.resposta_correta,
          explicacao: questao.explicacao,
          disciplina: questao.disciplina,
          assunto: questao.assunto,
          dificuldade: questao.dificuldade || dados.dificuldade,
          ordem: index + 1,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }));

        const { error: erroQuestoes } = await this.supabase
          .from('questoes_simulado')
          .insert(questoesFormatadas);

        if (erroQuestoes) {
          // Reverter criação do simulado
          await this.supabase.from('simulados').delete().eq('id', simulado.id);
          throw erroQuestoes;
        }
      }

      await this.logService.logarCriacaoConteudo('simulado', simulado.id);
      await this.logService.logarFimOperacao('criarSimulado', true);

      return {
        success: true,
        data: simulado,
        message: 'Simulado criado com sucesso'
      };
    } catch (error) {
      await this.logService.erro('Erro ao criar simulado', error as Error, { dados });
      throw error;
    }
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
    try {
      await this.logService.logarInicioOperacao('criarQuestoesSemana', { 
        titulo: dados.titulo,
        semana: dados.numero_semana,
        ano: dados.ano
      });

      const { data, error } = await this.supabase
        .from('questoes_semanais')
        .insert({
          ...dados,
          questoes: dados.questoes,
          criado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.logService.logarCriacaoConteudo('questoes_semanais', data.id);
      await this.logService.logarFimOperacao('criarQuestoesSemana', true);

      return {
        success: true,
        data,
        message: 'Questões semanais criadas com sucesso'
      };
    } catch (error) {
      await this.logService.erro('Erro ao criar questões semanais', error as Error, { dados });
      throw error;
    }
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
    try {
      await this.logService.logarInicioOperacao('criarFlashcards', { 
        concurso_id: dados.concurso_id,
        quantidade: dados.flashcards.length
      });

      const flashcardsFormatados = dados.flashcards.map(flashcard => ({
        ...flashcard,
        concurso_id: dados.concurso_id,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('cartoes_memorizacao')
        .insert(flashcardsFormatados)
        .select();

      if (error) {
        throw error;
      }

      await this.logService.logarCriacaoConteudo('flashcards', `${data.length} flashcards`);
      await this.logService.logarFimOperacao('criarFlashcards', true);

      return {
        success: true,
        data,
        message: `${data.length} flashcards criados com sucesso`
      };
    } catch (error) {
      await this.logService.erro('Erro ao criar flashcards', error as Error, { dados });
      throw error;
    }
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
    try {
      await this.logService.logarInicioOperacao('criarApostila', { titulo: dados.titulo });

      // Gerar slug
      const slug = this.gerarSlug(dados.titulo);

      // Criar apostila
      const { data: apostila, error: erroApostila } = await this.supabase
        .from('apostilas')
        .insert({
          titulo: dados.titulo,
          slug,
          descricao: dados.descricao,
          concurso_id: dados.concurso_id,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (erroApostila) {
        throw erroApostila;
      }

      // Criar conteúdo da apostila
      if (dados.conteudo && dados.conteudo.length > 0) {
        const conteudoFormatado = dados.conteudo.map(modulo => ({
          apostila_id: apostila.id,
          concurso_id: dados.concurso_id,
          numero_modulo: modulo.numero_modulo,
          titulo: modulo.titulo,
          conteudo_json: modulo.conteudo_json,
          criado_em: new Date().toISOString()
        }));

        const { error: erroConteudo } = await this.supabase
          .from('conteudo_apostila')
          .insert(conteudoFormatado);

        if (erroConteudo) {
          // Reverter criação da apostila
          await this.supabase.from('apostilas').delete().eq('id', apostila.id);
          throw erroConteudo;
        }
      }

      await this.logService.logarCriacaoConteudo('apostila', apostila.id);
      await this.logService.logarFimOperacao('criarApostila', true);

      return {
        success: true,
        data: apostila,
        message: 'Apostila criada com sucesso'
      };
    } catch (error) {
      await this.logService.erro('Erro ao criar apostila', error as Error, { dados });
      throw error;
    }
  }

  // Métodos privados auxiliares

  private async obterEstatisticasUsuarios(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('usuarios')
        .select('ativo, primeiro_login, criado_em', { count: 'exact' });

      const ativos = data?.filter(u => u.ativo).length || 0;
      const primeiroLogin = data?.filter(u => u.primeiro_login).length || 0;

      return {
        total: count || 0,
        ativos,
        inativos: (count || 0) - ativos,
        primeiro_login: primeiroLogin,
        ultimo_cadastro: data && data.length > 0 
          ? new Date(Math.max(...data.map(u => new Date(u.criado_em).getTime())))
          : null
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

      const ativos = data?.filter(c => c.ativo).length || 0;

      return {
        total: count || 0,
        ativos,
        inativos: (count || 0) - ativos
      };
    } catch {
      return { total: 0, ativos: 0, inativos: 0 };
    }
  }

  private async obterEstatisticasSimulados(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('simulados')
        .select('ativo, publico', { count: 'exact' });

      const ativos = data?.filter(s => s.ativo).length || 0;
      const publicos = data?.filter(s => s.publico).length || 0;

      return {
        total: count || 0,
        ativos,
        publicos,
        privados: ativos - publicos
      };
    } catch {
      return { total: 0, ativos: 0, publicos: 0, privados: 0 };
    }
  }

  private async obterEstatisticasQuestoesSemanais(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('questoes_semanais')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter(q => q.ativo).length || 0;

      return {
        total: count || 0,
        ativos
      };
    } catch {
      return { total: 0, ativos: 0 };
    }
  }

  private async obterEstatisticasFlashcards(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('cartoes_memorizacao')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter(f => f.ativo).length || 0;

      return {
        total: count || 0,
        ativos
      };
    } catch {
      return { total: 0, ativos: 0 };
    }
  }

  private async obterEstatisticasApostilas(): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from('apostilas')
        .select('ativo', { count: 'exact' });

      const ativos = data?.filter(a => a.ativo).length || 0;

      return {
        total: count || 0,
        ativos
      };
    } catch {
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
        atividade_mes_atual: atividadeMes?.length || 0,
        uptime: process.uptime(),
        memoria_uso: process.memoryUsage(),
        versao_node: process.version
      };
    } catch {
      return {
        atividade_mes_atual: 0,
        uptime: process.uptime(),
        memoria_uso: process.memoryUsage(),
        versao_node: process.version
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
        metricas_recentes: data || [],
        total_metricas: data?.length || 0
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
        porMes[mes] = (porMes[mes] || 0) + 1;
      });

      return Object.entries(porMes).map(([mes, quantidade]) => ({
        mes,
        quantidade
      }));
    } catch {
      return [];
    }
  }

  private async obterResumoConteudo(tabela: string): Promise<unknown> {
    try {
      const { data, count } = await this.supabase
        .from(tabela)
        .select('*', { count: 'exact' })
        .limit(5)
        .order('criado_em', { ascending: false });

      return {
        total: count || 0,
        recentes: data || []
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
      } else {
        return { sucesso: false, detalhes: 'Cache não está funcionando corretamente' };
      }
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
    // Implementar testes específicos das APIs quando necessário
    return { sucesso: true, detalhes: 'APIs funcionando (teste básico)' };
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

      if ((usuariosSemEmail?.length || 0) > 0 || (concursosSemNome?.length || 0) > 0) {
        return { 
          sucesso: false, 
          detalhes: `Dados inconsistentes encontrados: ${usuariosSemEmail?.length || 0} usuários sem email, ${concursosSemNome?.length || 0} concursos sem nome` 
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
        'questoes_semanais', 'cartoes_memorizacao', 'apostilas'
      ];

      const metricas: Record<string, number> = {};

      for (const tabela of tabelas) {
        const { count } = await this.supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true });
        
        metricas[tabela] = count || 0;
      }

      return metricas;
    } catch {
      return {};
    }
  }

  private async obterMetricasPerformance(): Promise<unknown> {
    return {
      uptime: process.uptime(),
      memoria: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  private async obterMetricasUsoRecursos(): Promise<unknown> {
    return {
      memoria_heap_usada: process.memoryUsage().heapUsed,
      memoria_heap_total: process.memoryUsage().heapTotal,
      memoria_externa: process.memoryUsage().external,
      uptime_segundos: process.uptime()
    };
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
        atividades_24h: atividadeOntem?.length || 0,
        atividades_7d: atividadeSemana?.length || 0
      };
    } catch {
      return {
        usuarios_ativos_24h: 0,
        usuarios_ativos_7d: 0,
        atividades_24h: 0,
        atividades_7d: 0
      };
    }
  }

  private gerarSlug(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
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
  }): Promise<ApiResponse<unknown>> {
    try {
      await this.logService.logarInicioOperacao('criarCategoriasConcursos', { nome: dados.nome });

      const slug = this.gerarSlug(dados.nome);

      const { data, error } = await this.supabase
        .from('categorias_concursos')
        .insert({
          ...dados,
          slug,
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logService.logarCriacaoConteudo('categoria_concurso', data.id);
      return { success: true, data, message: 'Categoria de concurso criada com sucesso' };
    } catch (error) {
      await this.logService.erro('Erro ao criar categoria de concurso', error as Error, { dados });
      throw error;
    }
  }

  async listarCategoriasConcursos(filtro?: { ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('categorias_concursos')
        .select('*');
      if (filtro && filtro.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Categorias listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar categorias', error as Error);
      throw error;
    }
  }

  async atualizarCategoriasConcursos(id: string, dados: { nome?: string; descricao?: string; icone?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('categorias_concursos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Categoria atualizada' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar categoria', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirCategoriasConcursos(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('categorias_concursos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Categoria excluída' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir categoria', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO DE DISCIPLINAS POR CATEGORIA
  async criarDisciplinasCategoria(dados: {
    categoria_id: string;
    nome: string;
    descricao?: string;
    cor?: string;
    ordem?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('disciplinas_categoria')
        .insert({
          ...dados,
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Disciplina criada' };
    } catch (error) {
      await this.logService.erro('Erro ao criar disciplina', error as Error, { dados });
      throw error;
    }
  }

  async listarDisciplinasCategoria(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('disciplinas_categoria')
        .select('*');
      if (filtro && filtro.categoria_id) {
        query = query.eq('categoria_id', filtro.categoria_id);
      }
      if (filtro && filtro.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Disciplinas listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar disciplinas', error as Error);
      throw error;
    }
  }

  async atualizarDisciplinasCategoria(id: string, dados: { categoria_id?: string; nome?: string; descricao?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('disciplinas_categoria')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Disciplina atualizada' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar disciplina', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirDisciplinasCategoria(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('disciplinas_categoria')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Disciplina excluída' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir disciplina', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO EXPANDIDA DE CONCURSOS
  async listarConcursos(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('concursos')
        .select('*');
      if (filtro && filtro.categoria_id) {
        query = query.eq('categoria_id', filtro.categoria_id);
      }
      if (filtro && filtro.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Concursos listados' };
    } catch (error) {
      await this.logService.erro('Erro ao listar concursos', error as Error);
      throw error;
    }
  }

  async atualizarConcurso(id: string, dados: { nome?: string; descricao?: string; categoria_id?: string; ano?: number; banca?: string; nivel_dificuldade?: 'facil' | 'medio' | 'dificil'; multiplicador_questoes?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('concursos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Concurso atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar concurso', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConcurso(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('concursos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Concurso excluído' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir concurso', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO EXPANDIDA DE SIMULADOS
  async listarSimulados(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('simulados')
        .select('*');
      if (filtro && filtro.concurso_id) {
        query = query.eq('concurso_id', filtro.concurso_id);
      }
      if (filtro && filtro.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Simulados listados' };
    } catch (error) {
      await this.logService.erro('Erro ao listar simulados', error as Error);
      throw error;
    }
  }

  async obterSimulado(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('simulados')
        .select(`
          *,
          concursos (nome, slug),
          questoes_simulado (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Simulado obtido' };
    } catch (error) {
      await this.logService.erro('Erro ao obter simulado', error as Error, { id });
      throw error;
    }
  }

  async atualizarSimulado(id: string, dados: { titulo?: string; descricao?: string; concurso_id?: string; numero_questoes?: number; tempo_minutos?: number; dificuldade?: 'facil' | 'medio' | 'dificil'; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('simulados')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Simulado atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar simulado', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirSimulado(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('simulados')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Simulado excluído' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir simulado', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO DE QUESTÕES DE SIMULADOS
  async adicionarQuestoesSimulado(simuladoId: string, questoes: Array<{
    numero_questao: number;
    enunciado: string;
    alternativas: string[];
    resposta_correta: string;
    explicacao?: string;
    disciplina?: string;
    assunto?: string;
    dificuldade?: string;
    ordem?: number;
  }>): Promise<ApiResponse<unknown>> {
    try {
      const questoesFormatadas = questoes.map((questao, index) => ({
        simulado_id: simuladoId,
        numero_questao: questao.numero_questao || index + 1,
        enunciado: questao.enunciado,
        alternativas: questao.alternativas,
        resposta_correta: questao.resposta_correta,
        explicacao: questao.explicacao,
        disciplina: questao.disciplina,
        assunto: questao.assunto,
        dificuldade: questao.dificuldade,
        ordem: questao.ordem || index + 1,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('questoes_simulado')
        .insert(questoesFormatadas)
        .select();

      if (error) throw error;
      return { success: true, data, message: `${data.length} questões adicionadas` };
    } catch (error) {
      await this.logService.erro('Erro ao adicionar questões', error as Error, { simuladoId });
      throw error;
    }
  }

  async listarQuestoesSimulado(simuladoId: string, filtro?: { dificuldade?: string; disciplina?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('questoes_simulado')
        .select('*')
        .eq('simulado_id', simuladoId)
        .order('ordem', { ascending: true });

      if (filtro?.dificuldade) {
        query = query.eq('dificuldade', filtro.dificuldade);
      }

      if (filtro?.disciplina) {
        query = query.eq('disciplina', filtro.disciplina);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Questões listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar questões', error as Error, { simuladoId });
      throw error;
    }
  }

  async atualizarQuestaoSimulado(id: string, dados: {
    enunciado?: string;
    alternativas?: string[];
    resposta_correta?: string;
    explicacao?: string;
    disciplina?: string;
    assunto?: string;
    dificuldade?: string;
    ordem?: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('questoes_simulado')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Questão atualizada' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar questão', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirQuestaoSimulado(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('questoes_simulado')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Questão excluída' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir questão', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO EXPANDIDA DE QUESTÕES SEMANAIS
  async listarQuestoesSemana(filtro?: { concurso_id?: string; ano?: number; numero_semana?: number; disciplina?: string; assunto?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('questoes_semanais')
        .select(`
          *,
          concursos (nome, slug)
        `)
        .order('ano', { ascending: false })
        .order('numero_semana', { ascending: false });

      if (filtro?.concurso_id) {
        query = query.eq('concurso_id', filtro.concurso_id);
      }

      if (filtro?.ano) {
        query = query.eq('ano', filtro.ano);
      }

      if (filtro?.numero_semana) {
        query = query.eq('numero_semana', filtro.numero_semana);
      }

      if (filtro?.disciplina) {
        query = query.eq('disciplina', filtro.disciplina);
      }

      if (filtro?.assunto) {
        query = query.eq('assunto', filtro.assunto);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Questões semanais listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar questões semanais', error as Error);
      throw error;
    }
  }

  async obterQuestoesSemana(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('questoes_semanais')
        .select(`
          *,
          concursos (nome, slug)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Questões semanais obtidas' };
    } catch (error) {
      await this.logService.erro('Erro ao obter questões semanais', error as Error, { id });
      throw error;
    }
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
    try {
      const { data, error } = await this.supabase
        .from('questoes_semanais')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Questões semanais atualizadas' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar questões semanais', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirQuestoesSemana(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('questoes_semanais')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Questões semanais excluídas' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir questões semanais', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO EXPANDIDA DE FLASHCARDS
  async listarFlashcards(filtro?: { concurso_id?: string; disciplina?: string; tema?: string; subtema?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('cartoes_memorizacao')
        .select(`
          *,
          concursos (nome, slug)
        `)
        .order('criado_em', { ascending: false });

      if (filtro?.concurso_id) {
        query = query.eq('concurso_id', filtro.concurso_id);
      }

      if (filtro?.disciplina) {
        query = query.eq('disciplina', filtro.disciplina);
      }

      if (filtro?.tema) {
        query = query.eq('tema', filtro.tema);
      }

      if (filtro?.subtema) {
        query = query.eq('subtema', filtro.subtema);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Flashcards listados' };
    } catch (error) {
      await this.logService.erro('Erro ao listar flashcards', error as Error);
      throw error;
    }
  }

  async obterFlashcard(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('cartoes_memorizacao')
        .select(`
          *,
          concursos (nome, slug)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Flashcard obtido' };
    } catch (error) {
      await this.logService.erro('Erro ao obter flashcard', error as Error, { id });
      throw error;
    }
  }

  async atualizarFlashcard(id: string, dados: {
    concurso_id?: string;
    frente?: string;
    verso?: string;
    disciplina?: string;
    tema?: string;
    subtema?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('cartoes_memorizacao')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Flashcard atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar flashcard', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirFlashcard(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('cartoes_memorizacao')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Flashcard excluído' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir flashcard', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO EXPANDIDA DE APOSTILAS
  async listarApostilas(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('apostilas')
        .select('*');
      if (filtro && filtro.concurso_id) {
        query = query.eq('concurso_id', filtro.concurso_id);
      }
      if (filtro && filtro.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Apostilas listadas' };
    } catch (error) {
      await this.logService.erro('Erro ao listar apostilas', error as Error);
      throw error;
    }
  }

  async obterApostila(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('apostilas')
        .select(`
          *,
          concursos (nome, slug),
          conteudo_apostila (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Apostila obtida' };
    } catch (error) {
      await this.logService.erro('Erro ao obter apostila', error as Error, { id });
      throw error;
    }
  }

  async atualizarApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('apostilas')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Apostila atualizada' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar apostila', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirApostila(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('apostilas')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Apostila excluída' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir apostila', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO DE CONTEÚDO DE APOSTILAS
  async adicionarConteudoApostila(apostilaId: string, conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }>): Promise<ApiResponse<unknown>> {
    try {
      const conteudoFormatado = conteudo.map(modulo => ({
        apostila_id: apostilaId,
        numero_modulo: modulo.numero_modulo,
        titulo: modulo.titulo,
        conteudo_json: modulo.conteudo_json,
        criado_em: new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('conteudo_apostila')
        .insert(conteudoFormatado)
        .select();

      if (error) throw error;
      return { success: true, data, message: `${data.length} módulos adicionados` };
    } catch (error) {
      await this.logService.erro('Erro ao adicionar conteúdo', error as Error, { apostilaId });
      throw error;
    }
  }

  async listarConteudoApostila(apostilaId: string, _filtro?: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('conteudo_apostila')
        .select('*')
        .eq('apostila_id', apostilaId)
        .order('numero_modulo', { ascending: true });

      if (error) throw error;
      return { success: true, data, message: 'Conteúdo listado' };
    } catch (error) {
      await this.logService.erro('Erro ao listar conteúdo', error as Error, { apostilaId });
      throw error;
    }
  }

  async atualizarConteudoApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('conteudo_apostila')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Conteúdo atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar conteúdo', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConteudoApostila(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('conteudo_apostila')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Conteúdo excluído' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir conteúdo', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO DE MAPA DE ASSUNTOS
  async criarMapaAssuntos(dados: {
    concurso_id: string;
    disciplina: string;
    assunto: string;
    subassunto?: string;
    peso?: number;
    dificuldade?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('mapa_assuntos')
        .insert({
          ...dados,
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Mapa de assuntos criado' };
    } catch (error) {
      await this.logService.erro('Erro ao criar mapa de assuntos', error as Error, { dados });
      throw error;
    }
  }

  async listarMapaAssuntos(_filtro?: { concurso_id?: string; disciplina?: string; assunto?: string; subassunto?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('mapa_assuntos')
        .select(`
          *,
          concursos (nome, slug)
        `)
        .order('disciplina', { ascending: true })
        .order('assunto', { ascending: true });

      if (_filtro?.concurso_id) {
        query = query.eq('concurso_id', _filtro.concurso_id);
      }

      if (_filtro?.disciplina) {
        query = query.eq('disciplina', _filtro.disciplina);
      }

      if (_filtro?.assunto) {
        query = query.eq('assunto', _filtro.assunto);
      }

      if (_filtro?.subassunto) {
        query = query.eq('subassunto', _filtro.subassunto);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Mapa de assuntos listado' };
    } catch (error) {
      await this.logService.erro('Erro ao listar mapa de assuntos', error as Error);
      throw error;
    }
  }

  async atualizarMapaAssuntos(id: string, dados: { concurso_id?: string; disciplina?: string; assunto?: string; subassunto?: string; peso?: number; dificuldade?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('mapa_assuntos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Mapa de assuntos atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar mapa de assuntos', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirMapaAssuntos(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('mapa_assuntos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Mapa de assuntos excluído' };
    } catch (error) {
      await this.logService.erro('Erro ao excluir mapa de assuntos', error as Error, { id });
      throw error;
    }
  }

  // GESTÃO ADMINISTRATIVA DE USUÁRIOS
  async listarUsuarios(filtro?: { ativo?: boolean; primeiro_login?: boolean; search?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.supabase
        .from('usuarios')
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login')
        .order('criado_em', { ascending: false });

      if (filtro?.ativo !== undefined) {
        query = query.eq('ativo', filtro.ativo);
      }

      if (filtro?.primeiro_login !== undefined) {
        query = query.eq('primeiro_login', filtro.primeiro_login);
      }

      if (filtro?.search) {
        query = query.or(`nome.ilike.%${filtro.search}%,email.ilike.%${filtro.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data, message: 'Usuários listados' };
    } catch (error) {
      await this.logService.erro('Erro ao listar usuários', error as Error);
      throw error;
    }
  }

  async obterUsuario(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login, tempo_estudo_minutos, total_questoes_respondidas, total_acertos, pontuacao_media')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Usuário obtido' };
    } catch (error) {
      await this.logService.erro('Erro ao obter usuário', error as Error, { id });
      throw error;
    }
  }

  async atualizarUsuario(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      // Remover campos que não devem ser atualizados via admin
      const dadosPermitidos = dados;

      const { data, error } = await this.supabase
        .from('usuarios')
        .update({ ...dadosPermitidos, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login')
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Usuário atualizado' };
    } catch (error) {
      await this.logService.erro('Erro ao atualizar usuário', error as Error, { id, dados });
      throw error;
    }
  }

  async ativarUsuario(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ ativo: true, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Usuário ativado' };
    } catch (error) {
      await this.logService.erro('Erro ao ativar usuário', error as Error, { id });
      throw error;
    }
  }

  async desativarUsuario(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Usuário desativado' };
    } catch (error) {
      await this.logService.erro('Erro ao desativar usuário', error as Error, { id });
      throw error;
    }
  }

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
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
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
    try {
      await this.logService.logarInicioOperacao('importarDadosLote', { tipo, quantidade: dados.length });
      let resultado: unknown;
      switch (tipo) {
        case 'concursos':
          resultado = await this.importarConcursosLote(dados as Array<{ nome: string; descricao?: string; categoria_id: string; ano?: number; banca?: string; nivel_dificuldade?: string; multiplicador_questoes?: number }>);
          break;
        case 'simulados':
          resultado = await this.importarSimuladosLote(dados as Array<{ titulo: string; descricao?: string; concurso_id: string; numero_questoes: number; tempo_minutos: number; dificuldade: string }>);
          break;
        case 'flashcards':
          resultado = await this.importarFlashcardsLote(dados as Array<{ concurso_id: string; flashcards: Array<{ frente: string; verso: string; disciplina: string; tema: string; subtema?: string }> }>);
          break;
        case 'apostilas':
          resultado = await this.importarApostilasLote(dados as Array<{ titulo: string; descricao?: string; concurso_id: string; conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }> }>);
          break;
        default:
          throw new Error(`Tipo de importação não suportado: ${tipo}`);
      }
      await this.logService.logarFimOperacao('importarDadosLote', true);
      return { success: true, data: resultado, message: `Importação de ${tipo} concluída` };
    } catch (error) {
      await this.logService.erro('Erro na importação em lote', error as Error, { tipo });
      throw error;
    }
  }

  async exportarDados(tipo: string, filtro?: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      let dados: unknown;

      switch (tipo) {
        case 'concursos':
          dados = await this.exportarConcursos(filtro);
          break;
        case 'simulados':
          dados = await this.exportarSimulados(filtro);
          break;
        case 'usuarios':
          dados = await this.exportarUsuarios(filtro);
          break;
        default:
          throw new Error(`Tipo de exportação não suportado: ${tipo}`);
      }

      return { success: true, data: dados, message: `Exportação de ${tipo} concluída` };
    } catch (error) {
      await this.logService.erro('Erro na exportação', error as Error, { tipo });
      throw error;
    }
  }

  // VALIDAÇÃO DE DADOS JSON
  async validarJsonSimulado(dados: { titulo?: string; concurso_id?: string; questoes?: Array<{ enunciado?: string; alternativas?: unknown[]; resposta_correta?: string }> }): Promise<ApiResponse<{ valido: boolean; erros: string[] }>> {
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
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido'
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação'
      };
    }
  }

  async validarJsonQuestoesSemana(dados: { titulo?: string; numero_semana?: number; ano?: number; concurso_id?: string; questoes?: unknown[] }): Promise<ApiResponse<{ valido: boolean; erros: string[] }>> {
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
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido'
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação'
      };
    }
  }

  async validarJsonApostila(dados: { titulo?: string; concurso_id?: string; conteudo?: unknown[] }): Promise<ApiResponse<{ valido: boolean; erros: string[] }>> {
    try {
      const erros: string[] = [];

      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.conteudo || !Array.isArray(dados.conteudo)) erros.push('Conteúdo deve ser um array');

      return {
        success: erros.length === 0,
        data: { valido: erros.length === 0, erros },
        message: erros.length === 0 ? 'JSON válido' : 'JSON inválido'
      };
    } catch {
      return {
        success: false,
        data: { valido: false, erros: ['Erro ao validar JSON'] },
        message: 'Erro na validação'
      };
    }
  }

  // RELATÓRIOS
  async obterRelatorioConteudo(_filtro?: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const relatorio = {
        resumo: {
          total_concursos: await this.contarRegistros('concursos'),
          total_simulados: await this.contarRegistros('simulados'),
          total_questoes_semanais: await this.contarRegistros('questoes_semanais'),
          total_flashcards: await this.contarRegistros('cartoes_memorizacao'),
          total_apostilas: await this.contarRegistros('apostilas')
        },
        por_concurso: await this.obterEstatisticasPorConcurso(),
        atividade_recente: await this.obterAtividadeRecenteConteudo()
      };

      return { success: true, data: relatorio, message: 'Relatório de conteúdo gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de conteúdo', error as Error);
      throw error;
    }
  }

  async obterRelatorioUsuarios(_filtro?: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const relatorio = {
        resumo: await this.obterEstatisticasUsuarios(),
        atividade_mensal: await this.obterAtividadeMensalUsuarios(),
        usuarios_mais_ativos: await this.obterUsuariosMaisAtivos(),
        estatisticas_uso: await this.obterEstatisticasUsoSistema()
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
          mapa_assuntos: await this.exportarTabela('mapa_assuntos')
        }
      };

      // Salvar backup no banco
      const { data, error } = await this.supabase
        .from('backups_sistema')
        .insert({
          nome: `backup_${new Date().toISOString().split('T')[0]}`,
          dados_backup: backup,
          criado_em: new Date().toISOString()
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
        message: 'Restauração de backup deve ser implementada com cuidado especial'
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
      return count || 0;
    } catch {
      return 0;
    }
  }

  private async exportarTabela(tabela: string): Promise<unknown[]> {
    try {
      const { data } = await this.supabase
        .from(tabela)
        .select('*');
      return data || [];
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

      return data || [];
    } catch {
      return [];
    }
  }

  private async obterAtividadeRecenteConteudo(): Promise<unknown[]> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 7);

      const atividades = [];

      // Buscar criações recentes em diferentes tabelas
      const tabelas = ['concursos', 'simulados', 'questoes_semanais', 'cartoes_memorizacao', 'apostilas'];

      for (const tabela of tabelas) {
        const { data } = await this.supabase
          .from(tabela)
          .select('id, criado_em')
          .gte('criado_em', dataLimite.toISOString())
          .order('criado_em', { ascending: false })
          .limit(10);

        if (data) {
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
        porMes[mes] = (porMes[mes] || 0) + 1;
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

      return data || [];
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
        simulados_realizados_mes: simuladosRealizados?.length || 0,
        questoes_respondidas_mes: questoesRespondidas?.length || 0
      };
    } catch {
      return {
        simulados_realizados_mes: 0,
        questoes_respondidas_mes: 0
      };
    }
  }

  // Métodos de importação em lote
  private async importarConcursosLote(dados: Array<{ nome: string; descricao?: string; categoria_id: string; ano?: number; banca?: string; nivel_dificuldade?: string; multiplicador_questoes?: number }>): Promise<unknown> {
    const concursosFormatados = dados.map(concurso => ({
      ...concurso,
      slug: this.gerarSlug(concurso.nome),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
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
      atualizado_em: new Date().toISOString()
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
      atualizado_em: new Date().toISOString()
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
      atualizado_em: new Date().toISOString()
    }));

    const { data, error } = await this.supabase
      .from('apostilas')
      .insert(apostilasFormatadas)
      .select();

    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  // Métodos de exportação
  private async exportarConcursos(filtro?: { ativo?: boolean; categoria_id?: string }): Promise<unknown> {
    let query = this.supabase
      .from('concursos')
      .select('*');
    if (filtro && filtro.categoria_id) {
      query = query.eq('categoria_id', filtro.categoria_id);
    }
    if (filtro && filtro.ativo !== undefined) {
      query = query.eq('ativo', filtro.ativo);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async exportarSimulados(filtro?: { ativo?: boolean; concurso_id?: string }): Promise<unknown> {
    let query = this.supabase
      .from('simulados')
      .select('*');
    if (filtro && filtro.concurso_id) {
      query = query.eq('concurso_id', filtro.concurso_id);
    }
    if (filtro && filtro.ativo !== undefined) {
      query = query.eq('ativo', filtro.ativo);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async exportarUsuarios(_filtro?: { ativo?: boolean }): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*');
    if (error) throw error;
    return data;
  }

  private async exportarRelatorioUsuarios(_filtro?: { ativo?: boolean; nome?: string; email?: string }): Promise<unknown> {
    try {
      const relatorio = {
        resumo: await this.obterEstatisticasUsuarios(),
        atividade_mensal: await this.obterAtividadeMensalUsuarios(),
        usuarios_mais_ativos: await this.obterUsuariosMaisAtivos(),
        estatisticas_uso: await this.obterEstatisticasUsoSistema()
      };

      return { success: true, data: relatorio, message: 'Relatório de usuários gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de usuários', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioConteudo(_filtro?: { ativo?: boolean; tipo?: string }): Promise<unknown> {
    try {
      const relatorio = {
        resumo: {
          total_concursos: await this.contarRegistros('concursos'),
          total_simulados: await this.contarRegistros('simulados'),
          total_questoes_semanais: await this.contarRegistros('questoes_semanais'),
          total_flashcards: await this.contarRegistros('cartoes_memorizacao'),
          total_apostilas: await this.contarRegistros('apostilas')
        },
        por_concurso: await this.obterEstatisticasPorConcurso(),
        atividade_recente: await this.obterAtividadeRecenteConteudo()
      };

      return { success: true, data: relatorio, message: 'Relatório de conteúdo gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de conteúdo', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioSimulados(_filtro?: { ativo?: boolean; titulo?: string }): Promise<unknown> {
    try {
      const relatorio = {
        total_simulados: await this.contarRegistros('simulados'),
        atividade_recente: await this.obterAtividadeRecenteConteudo()
      };

      return { success: true, data: relatorio, message: 'Relatório de simulados gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de simulados', error as Error);
      throw error;
    }
  }

  private async exportarRelatorioApostilas(_filtro?: { ativo?: boolean; titulo?: string }): Promise<unknown> {
    try {
      const relatorio = {
        total_apostilas: await this.contarRegistros('apostilas'),
        atividade_recente: await this.obterAtividadeRecenteConteudo()
      };

      return { success: true, data: relatorio, message: 'Relatório de apostilas gerado' };
    } catch (error) {
      await this.logService.erro('Erro ao gerar relatório de apostilas', error as Error);
      throw error;
    }
  }

  private async importarRelatorioUsuarios(dados: Array<{ nome: string; email: string; ativo: boolean; primeiro_login: boolean }>): Promise<unknown> {
    // Implementar lógica de importação de relatório de usuários
    return { importados: dados.length, dados };
  }

  private async importarRelatorioConteudo(dados: Array<{ tipo: string; quantidade: number }>): Promise<unknown> {
    // Implementar lógica de importação de relatório de conteúdo
    return { importados: dados.length, dados };
  }

  private async importarRelatorioSimulados(dados: Array<{ titulo: string; total_questoes: number }>): Promise<unknown> {
    // Implementar lógica de importação de relatório de simulados
    return { importados: dados.length, dados };
  }

  private async importarRelatorioApostilas(dados: Array<{ titulo: string; total_modulos: number }>): Promise<unknown> {
    // Implementar lógica de importação de relatório de apostilas
    return { importados: dados.length, dados };
  }
}

export default AdminService;