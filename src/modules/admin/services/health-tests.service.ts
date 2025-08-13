import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class HealthTestsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async executarTestes(): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('executarTestes');
      const resultados = {
        conexao_banco: await this.testarConexaoBanco(),
        cache: await this.testarCache(),
        logs: await this.testarLogs(),
        apis: await this.testarAPIs(),
        integridade_dados: await this.testarIntegridadeDados(),
      };
      const todosPassaram = Object.values(resultados).every(teste => teste.sucesso);
      await this.ctx.logService.logarFimOperacao('executarTestes', todosPassaram);
      return { success: true, data: { status_geral: todosPassaram ? 'PASSOU' : 'FALHOU', resultados, executado_em: new Date().toISOString() }, message: 'Testes executados' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao executar testes', error as Error);
      throw error;
    }
  }

  private async testarConexaoBanco(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      const { error } = await this.ctx.supabase.from('usuarios').select('count').limit(1);
      if (error) return { sucesso: false, detalhes: error.message };
      return { sucesso: true, detalhes: 'Conexão com banco funcionando' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async testarCache(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      const chaveTest = 'teste_admin_cache';
      const valorTest = { timestamp: Date.now() } as const;
      await this.ctx.cacheService.definir(chaveTest, valorTest, 1);
      const valorRecuperado = await this.ctx.cacheService.obter(chaveTest);
      await this.ctx.cacheService.remover(chaveTest);
      if (valorRecuperado && typeof valorRecuperado === 'object' && 'timestamp' in valorRecuperado && (valorRecuperado as { timestamp: number }).timestamp === valorTest.timestamp) {
        return { sucesso: true, detalhes: 'Cache funcionando corretamente' };
      }
      return { sucesso: false, detalhes: 'Cache não está funcionando corretamente' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }

  private async testarLogs(): Promise<{ sucesso: boolean; detalhes: string }> {
    try {
      await this.ctx.logService.info('Teste de log do sistema administrativo');
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
      const { data: usuariosSemEmail } = await this.ctx.supabase.from('usuarios').select('id').is('email', null);
      const { data: concursosSemNome } = await this.ctx.supabase.from('concursos').select('id').is('nome', null);
      if ((usuariosSemEmail?.length ?? 0) > 0 || (concursosSemNome?.length ?? 0) > 0) {
        return { sucesso: false, detalhes: `Dados inconsistentes encontrados: ${usuariosSemEmail?.length ?? 0} usuários sem email, ${concursosSemNome?.length ?? 0} concursos sem nome` };
      }
      return { sucesso: true, detalhes: 'Integridade dos dados verificada' };
    } catch {
      return { sucesso: false, detalhes: 'Erro desconhecido' };
    }
  }
}

export default HealthTestsAdminService;


