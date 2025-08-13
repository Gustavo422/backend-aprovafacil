import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class UsersAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async listarUsuarios(filtro?: { ativo?: boolean; primeiro_login?: boolean; search?: string }): Promise<ApiResponse<unknown>> {
    try {
      const query = this.ctx.supabase
        .from('usuarios')
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login')
        .order('criado_em', { ascending: false });

      if (filtro?.ativo !== undefined) query.eq('ativo', filtro.ativo);
      if (filtro?.primeiro_login !== undefined) query.eq('primeiro_login', filtro.primeiro_login);
      if (filtro?.search) query.or(`nome.ilike.%${filtro.search}%,email.ilike.%${filtro.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Usuários listados' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar usuários', error as Error);
      throw error;
    }
  }

  async obterUsuario(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('usuarios')
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login, tempo_estudo_minutos, total_questoes_respondidas, total_acertos, pontuacao_media')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Usuário obtido' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter usuário', error as Error, { id });
      throw error;
    }
  }

  async atualizarUsuario(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('usuarios')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select('id, nome, email, ativo, primeiro_login, criado_em, ultimo_login')
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Usuário atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar usuário', error as Error, { id, dados });
      throw error;
    }
  }

  async ativarUsuario(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('usuarios')
        .update({ ativo: true, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Usuário ativado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao ativar usuário', error as Error, { id });
      throw error;
    }
  }

  async desativarUsuario(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('usuarios')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Usuário desativado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao desativar usuário', error as Error, { id });
      throw error;
    }
  }

  async gerenciarUsuarios(): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('gerenciarUsuarios');

      const usuarios = await this.ctx.usuarioRepository.buscarTodos({ limit: 100 });
      const usuariosAtivos = await this.ctx.usuarioRepository.buscarUsuariosAtivos();
      const usuariosPrimeiroLogin = await this.ctx.usuarioRepository.obterUsuariosComPrimeiroLogin();

      const gerenciamento = {
        total_usuarios: usuarios.data?.length ?? 0,
        usuarios_ativos: usuariosAtivos.length,
        usuarios_primeiro_login: usuariosPrimeiroLogin.length,
        usuarios_recentes: usuarios.data?.slice(0, 10) ?? [],
        estatisticas_por_mes: await this.obterEstatisticasUsuariosPorMes(),
      };

      await this.ctx.logService.logarFimOperacao('gerenciarUsuarios', true);
      return { success: true, data: gerenciamento, message: 'Dados de gerenciamento de usuários obtidos' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao gerenciar usuários', error as Error);
      throw error;
    }
  }

  private async obterEstatisticasUsuariosPorMes(): Promise<unknown[]> {
    try {
      const { data } = await this.ctx.supabase
        .from('usuarios')
        .select('criado_em')
        .order('criado_em', { ascending: false });

      const porMes: Record<string, number> = {};
      data?.forEach(usuario => {
        const mes = new Date(usuario.criado_em as unknown as string).toISOString().substring(0, 7);
        porMes[mes] = (porMes[mes] ?? 0) + 1;
      });

      return Object.entries(porMes).map(([mes, quantidade]) => ({ mes, quantidade }));
    } catch {
      return [];
    }
  }
}

export default UsersAdminService;