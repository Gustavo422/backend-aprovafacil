import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';
import { gerarSlug } from '../utils/slug.js';

export class ImportExportAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async importarDadosLote(tipo: 'concursos' | 'simulados' | 'flashcards' | 'apostilas', dados: unknown[]): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('importarDadosLote', { tipo, quantidade: dados.length });
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
      await this.ctx.logService.logarFimOperacao('importarDadosLote', true);
      return { success: true, data: resultado, message: `Importação de ${tipo} concluída` };
    } catch (error) {
      await this.ctx.logService.erro('Erro na importação em lote', error as Error, { tipo });
      throw error;
    }
  }

  async exportarDados(tipo: 'concursos' | 'simulados' | 'usuarios' | 'relatorio:usuarios' | 'relatorio:conteudo' | 'relatorio:simulados' | 'relatorio:apostilas'): Promise<ApiResponse<unknown>> {
    try {
      let dados: unknown;
      switch (tipo) {
      case 'concursos':
        dados = await this.exportarConcursos();
        break;
      case 'simulados':
        dados = await this.exportarSimulados();
        break;
      case 'usuarios':
        dados = await this.exportarUsuarios();
        break;
      case 'relatorio:usuarios':
        dados = await this.exportarRelatorioUsuarios();
        break;
      case 'relatorio:conteudo':
        dados = await this.exportarRelatorioConteudo();
        break;
      case 'relatorio:simulados':
        dados = await this.exportarRelatorioSimulados();
        break;
      case 'relatorio:apostilas':
        dados = await this.exportarRelatorioApostilas();
        break;
      default:
        throw new Error(`Tipo de exportação não suportado: ${tipo}`);
      }
      return { success: true, data: dados, message: `Exportação de ${tipo} concluída` };
    } catch (error) {
      await this.ctx.logService.erro('Erro na exportação', error as Error, { tipo });
      throw error;
    }
  }

  private async importarConcursosLote(dados: Array<{ nome: string; descricao?: string; categoria_id: string; ano?: number; banca?: string; nivel_dificuldade?: string; multiplicador_questoes?: number }>): Promise<unknown> {
    const concursosFormatados = dados.map(concurso => ({ ...concurso, slug: gerarSlug(concurso.nome), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }));
    const { data, error } = await this.ctx.supabase.from('concursos').insert(concursosFormatados).select();
    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarSimuladosLote(dados: Array<{ titulo: string; descricao?: string; concurso_id: string; numero_questoes: number; tempo_minutos: number; dificuldade: string }>): Promise<unknown> {
    const simuladosFormatados = dados.map(simulado => ({ ...simulado, slug: gerarSlug(simulado.titulo), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }));
    const { data, error } = await this.ctx.supabase.from('simulados').insert(simuladosFormatados).select();
    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarFlashcardsLote(dados: Array<{ concurso_id: string; flashcards: Array<{ frente: string; verso: string; disciplina: string; tema: string; subtema?: string }> }>): Promise<unknown> {
    const linhas: Array<Record<string, unknown>> = [];
    for (const grupo of dados) {
      for (const f of grupo.flashcards) {
        linhas.push({ ...f, concurso_id: grupo.concurso_id, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() });
      }
    }
    const { data, error } = await this.ctx.supabase.from('cartoes_memorizacao').insert(linhas).select();
    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async importarApostilasLote(dados: Array<{ titulo: string; descricao?: string; concurso_id: string; conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }> }>): Promise<unknown> {
    const apostilasFormatadas = dados.map(apostila => ({ ...apostila, slug: gerarSlug(apostila.titulo), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }));
    // Note: Conteúdo de apostila normalmente demanda transação; manter simples aqui
    const { data, error } = await this.ctx.supabase.from('apostilas').insert(apostilasFormatadas as never).select();
    if (error) throw error;
    return { importados: data.length, dados: data };
  }

  private async exportarConcursos(): Promise<unknown> {
    const { data, error } = await this.ctx.supabase.from('concursos').select('*');
    if (error) throw error;
    return data;
  }

  private async exportarSimulados(): Promise<unknown> {
    const { data, error } = await this.ctx.supabase
      .from('simulados')
      .select('id, titulo, slug, descricao, concurso_id, numero_questoes, tempo_minutos, dificuldade, publico, ativo, criado_em, atualizado_em');
    if (error) throw error;
    return data;
  }

  private async exportarUsuarios(): Promise<unknown> {
    const { data, error } = await this.ctx.supabase.from('usuarios').select('*');
    if (error) throw error;
    return data;
  }

  private async exportarRelatorioUsuarios(): Promise<unknown> {
    const resumo = await this.obterEstatisticasUsuarios();
    const atividade_mensal = await this.obterAtividadeMensalUsuarios();
    const usuarios_mais_ativos = await this.obterUsuariosMaisAtivos();
    const estatisticas_uso = await this.obterEstatisticasUsoSistema();
    return { success: true, data: { resumo, atividade_mensal, usuarios_mais_ativos, estatisticas_uso }, message: 'Relatório de usuários gerado' };
  }

  private async exportarRelatorioConteudo(): Promise<unknown> {
    const resumo = {
      total_concursos: await this.contarRegistros('concursos'),
      total_simulados: await this.contarRegistros('simulados'),
      total_questoes_semanais: await this.contarRegistros('questoes_semanais'),
      total_flashcards: await this.contarRegistros('cartoes_memorizacao'),
      total_apostilas: await this.contarRegistros('apostilas'),
    };
    const por_concurso = await this.obterEstatisticasPorConcurso();
    const atividade_recente = await this.obterAtividadeRecenteConteudo();
    return { success: true, data: { resumo, por_concurso, atividade_recente }, message: 'Relatório de conteúdo gerado' };
  }

  private async exportarRelatorioSimulados(): Promise<unknown> {
    const relatorio = { total_simulados: await this.contarRegistros('simulados'), atividade_recente: await this.obterAtividadeRecenteConteudo() };
    return { success: true, data: relatorio, message: 'Relatório de simulados gerado' };
  }

  private async exportarRelatorioApostilas(): Promise<unknown> {
    const relatorio = { total_apostilas: await this.contarRegistros('apostilas'), atividade_recente: await this.obterAtividadeRecenteConteudo() };
    return { success: true, data: relatorio, message: 'Relatório de apostilas gerado' };
  }

  // Auxiliares para relatórios
  private async contarRegistros(tabela: string): Promise<number> {
    try {
      const { count } = await this.ctx.supabase.from(tabela).select('*', { count: 'exact', head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  private async obterEstatisticasPorConcurso(): Promise<unknown[]> {
    try {
      const { data } = await this.ctx.supabase
        .from('concursos')
        .select('id, nome, _simulados:simulados(count), _flashcards:cartoes_memorizacao(count), _apostilas:apostilas(count)');
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
      const tabelas = ['concursos', 'simulados', 'questoes_semanais', 'cartoes_memorizacao', 'apostilas'];
      for (const tabela of tabelas) {
        const { data } = await this.ctx.supabase
          .from(tabela)
          .select('id, criado_em')
          .gte('criado_em', dataLimite.toISOString())
          .order('criado_em', { ascending: false })
          .limit(10);
        if (Array.isArray(data)) atividades.push(...data.map(item => ({ ...item, tipo: tabela })) as never);
      }
      return atividades.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    } catch {
      return [];
    }
  }

  private async obterEstatisticasUsuarios(): Promise<unknown> {
    const { data, count } = await this.ctx.supabase.from('usuarios').select('ativo, primeiro_login, criado_em', { count: 'exact' });
    const ativos = data?.filter((u: { ativo: boolean }) => u.ativo).length ?? 0;
    const primeiroLogin = data?.filter((u: { primeiro_login: boolean }) => u.primeiro_login).length ?? 0;
    return { total: count ?? 0, ativos, inativos: (count ?? 0) - ativos, primeiro_login: primeiroLogin };
  }

  private async obterAtividadeMensalUsuarios(): Promise<unknown[]> {
    try {
      const { data } = await this.ctx.supabase.from('usuarios').select('criado_em').order('criado_em', { ascending: false });
      const porMes: Record<string, number> = {};
      data?.forEach(usuario => {
        const mes = new Date(usuario.criado_em as unknown as string).toISOString().substring(0, 7);
        porMes[mes] = (porMes[mes] ?? 0) + 1;
      });
      return Object.entries(porMes).map(([mes, quantidade]) => ({ mes, quantidade }));
    } catch { return []; }
  }

  private async obterUsuariosMaisAtivos(): Promise<unknown[]> {
    try {
      const { data } = await this.ctx.supabase
        .from('usuarios')
        .select('id, nome, email, total_questoes_respondidas, tempo_estudo_minutos')
        .order('total_questoes_respondidas', { ascending: false })
        .limit(10);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  private async obterEstatisticasUsoSistema(): Promise<unknown> {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const { data: simuladosRealizados } = await this.ctx.supabase.from('progresso_usuario_simulado').select('id').gte('concluido_em', inicioMes.toISOString());
      const { data: questoesRespondidas } = await this.ctx.supabase.from('respostas_questoes_semanais').select('id').gte('criado_em', inicioMes.toISOString());
      return { simulados_realizados_mes: simuladosRealizados?.length ?? 0, questoes_respondidas_mes: questoesRespondidas?.length ?? 0 };
    } catch {
      return { simulados_realizados_mes: 0, questoes_respondidas_mes: 0 };
    }
  }
}

export default ImportExportAdminService;


