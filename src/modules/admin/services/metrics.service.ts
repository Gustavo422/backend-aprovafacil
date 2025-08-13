import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class MetricsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async obterMetricas(): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('obterMetricasAdmin');
      const metricas = {
        cache: await this.ctx.cacheService.obterEstatisticas(),
        banco_dados: await this.obterMetricasBancoDados(),
        performance: await this.obterMetricasPerformance(),
        uso_recursos: await this.obterMetricasUsoRecursos(),
        atividade_usuarios: await this.obterMetricasAtividadeUsuarios(),
      };
      await this.ctx.logService.logarFimOperacao('obterMetricasAdmin', true);
      return { success: true, data: metricas, message: 'Métricas obtidas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter métricas', error as Error);
      throw error;
    }
  }

  async obterEstatisticasSistema(): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('obterEstatisticasSistema');
      const estatisticas = {
        usuarios: await this.obterEstatisticasUsuarios(),
        concursos: await this.obterEstatisticasConcursos(),
        simulados: await this.obterEstatisticasSimulados(),
        questoes_semanais: await this.obterEstatisticasQuestoesSemanais(),
        flashcards: await this.obterEstatisticasFlashcards(),
        apostilas: await this.obterEstatisticasApostilas(),
        sistema: await this.obterEstatisticasSistemaGeral(),
        performance: await this.obterEstatisticasPerformance(),
      };
      await this.ctx.logService.logarFimOperacao('obterEstatisticasSistema', true);
      return { success: true, data: estatisticas, message: 'Estatísticas do sistema obtidas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas do sistema', error as Error);
      throw error;
    }
  }

  async obterEstatisticasUsuarios(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('usuarios').select('ativo, primeiro_login, criado_em', { count: 'exact' });
      const ativos = data?.filter((u: { ativo: boolean }) => u.ativo).length ?? 0;
      const primeiroLogin = data?.filter((u: { primeiro_login: boolean }) => u.primeiro_login).length ?? 0;
      return {
        total: count ?? 0,
        ativos,
        inativos: (count ?? 0) - ativos,
        primeiro_login: primeiroLogin,
        ultimo_cadastro: data && data.length > 0 ? new Date(Math.max(...data.map((u: { criado_em: string }) => new Date(u.criado_em).getTime()))) : null,
      };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de usuários', error as Error);
      return { total: 0, ativos: 0, inativos: 0, primeiro_login: 0, ultimo_cadastro: null };
    }
  }

  async obterEstatisticasConcursos(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('concursos').select('ativo, criado_em', { count: 'exact' });
      const ativos = data?.filter((c: { ativo: boolean }) => c.ativo).length ?? 0;
      return { total: count ?? 0, ativos, inativos: (count ?? 0) - ativos };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de concursos', error as Error);
      return { total: 0, ativos: 0, inativos: 0 };
    }
  }

  async obterEstatisticasSimulados(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('simulados').select('ativo, publico', { count: 'exact' });
      const ativos = data?.filter((s: { ativo: boolean }) => s.ativo).length ?? 0;
      const publicos = data?.filter((s: { publico: boolean }) => s.publico).length ?? 0;
      return { total: count ?? 0, ativos, publicos, privados: ativos - publicos };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de simulados', error as Error);
      return { total: 0, ativos: 0, publicos: 0, privados: 0 };
    }
  }

  async obterEstatisticasQuestoesSemanais(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('questoes_semanais').select('ativo', { count: 'exact' });
      const ativos = data?.filter((q: { ativo: boolean }) => q.ativo).length ?? 0;
      return { total: count ?? 0, ativos };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de questões semanais', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  async obterEstatisticasFlashcards(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('cartoes_memorizacao').select('ativo', { count: 'exact' });
      const ativos = data?.filter((f: { ativo: boolean }) => f.ativo).length ?? 0;
      return { total: count ?? 0, ativos };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de flashcards', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  async obterEstatisticasApostilas(): Promise<unknown> {
    try {
      const { data, count } = await this.ctx.supabase.from('apostilas').select('ativo', { count: 'exact' });
      const ativos = data?.filter((a: { ativo: boolean }) => a.ativo).length ?? 0;
      return { total: count ?? 0, ativos };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter estatísticas de apostilas', error as Error);
      return { total: 0, ativos: 0 };
    }
  }

  async obterEstatisticasSistemaGeral(): Promise<unknown> {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const { data: atividadeMes } = await this.ctx.supabase
        .from('progresso_usuario_simulado')
        .select('id')
        .gte('concluido_em', inicioMes.toISOString());
      return { atividade_mes_atual: atividadeMes?.length ?? 0, uptime: process.uptime(), memoria_uso: process.memoryUsage(), versao_node: process.version };
    } catch {
      return { atividade_mes_atual: 0, uptime: process.uptime(), memoria_uso: process.memoryUsage(), versao_node: process.version };
    }
  }

  async obterEstatisticasPerformance(): Promise<unknown> {
    try {
      const { data } = await this.ctx.supabase
        .from('historico_metricas')
        .select('tipo, valor, coletado_em')
        .order('coletado_em', { ascending: false })
        .limit(100);
      return { metricas_recentes: data ?? [], total_metricas: data?.length ?? 0 };
    } catch {
      return { metricas_recentes: [], total_metricas: 0 };
    }
  }

  private async obterMetricasBancoDados(): Promise<unknown> {
    try {
      const tabelas = ['usuarios', 'concursos', 'simulados', 'questoes_simulado', 'questoes_semanais', 'cartoes_memorizacao', 'apostilas'];
      const metricas: Record<string, number> = {};
      for (const tabela of tabelas) {
        const { count } = await this.ctx.supabase.from(tabela).select('*', { count: 'exact', head: true });
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
      const { data: atividadeOntem } = await this.ctx.supabase.from('progresso_usuario_simulado').select('usuario_id').gte('concluido_em', ontem.toISOString());
      const { data: atividadeSemana } = await this.ctx.supabase.from('progresso_usuario_simulado').select('usuario_id').gte('concluido_em', semanaPassada.toISOString());
      const usuariosAtivosOntem = new Set(atividadeOntem?.map(a => a.usuario_id)).size;
      const usuariosAtivosSemana = new Set(atividadeSemana?.map(a => a.usuario_id)).size;
      return { usuarios_ativos_24h: usuariosAtivosOntem, usuarios_ativos_7d: usuariosAtivosSemana, atividades_24h: atividadeOntem?.length ?? 0, atividades_7d: atividadeSemana?.length ?? 0 };
    } catch {
      return { usuarios_ativos_24h: 0, usuarios_ativos_7d: 0, atividades_24h: 0, atividades_7d: 0 };
    }
  }
}

export default MetricsAdminService;


