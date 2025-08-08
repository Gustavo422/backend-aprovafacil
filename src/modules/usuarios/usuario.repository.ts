// Repositório de usuários para o AprovaFácil
import { supabase } from '../../config/supabase-unified.js';
import type { ILogService } from '../../core/interfaces/index.js';
import type { Usuario, FiltroBase, PaginatedResponse, EstatisticasUsuario } from '../../shared/types/index.js';

export class UsuarioRepository {
  constructor(private readonly logService: ILogService) {}

  private aplicarFiltros(query: any, _filtro: FiltroBase) {
    // TODO: Implementar filtros
    return query;
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao buscar usuário por ID.', this.toError(error));
      throw error;
    }
  }

  async buscarPorAuthUserId(authUserId: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao buscar usuário por Auth User ID.', this.toError(error));
      throw error;
    }
  }

  async buscarTodos(filtro?: FiltroBase): Promise<PaginatedResponse<Usuario>> {
    try {
      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' });

      if (filtro) {
        query = this.aplicarFiltros(query, filtro);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count ?? 0;
      const usuarios = (data as Usuario[]) ?? [];

      return {
        success: true,
        data: usuarios,
        pagination: {
          page: 1,
          limit: usuarios.length,
          total,
          totalPages: Math.ceil(total / usuarios.length),
        },
      };
    } catch (error) {
      await this.logService.erro('Erro ao buscar todos os usuários.', this.toError(error));
      throw error;
    }
  }

  async criar(dados: Partial<Usuario>): Promise<Usuario> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert(dados)
        .select()
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao criar usuário.', this.toError(error));
      throw error;
    }
  }

  async atualizar(id: string, dados: Partial<Usuario>): Promise<Usuario> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar usuário.', this.toError(error));
      throw error;
    }
  }

  async atualizarPorAuthUserId(authUserId: string, dados: Partial<Usuario>): Promise<Usuario> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('auth_user_id', authUserId)
        .select()
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar usuário por Auth User ID.', this.toError(error));
      throw error;
    }
  }

  async excluir(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      await this.logService.erro('Erro ao excluir usuário.', this.toError(error));
      throw error;
    }
  }

  async excluirPorAuthUserId(authUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('auth_user_id', authUserId);

      if (error) throw error;
      return true;
    } catch (error) {
      await this.logService.erro('Erro ao excluir usuário por Auth User ID.', this.toError(error));
      throw error;
    }
  }

  async existePorId(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', id)
        .single();

      if (error) throw error;
      return !!data;
    } catch (error) {
      await this.logService.erro('Erro ao verificar existência do usuário.', this.toError(error));
      throw error;
    }
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      await this.logService.erro('Erro ao buscar usuário por email.', this.toError(error));
      throw error;
    }
  }

  async atualizarUltimoLogin(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar último login.', this.toError(error));
      throw error;
    }
  }

  async atualizarUltimoLoginPorAuthUserId(authUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('auth_user_id', authUserId);

      if (error) throw error;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar último login por Auth User ID.', this.toError(error));
      throw error;
    }
  }

  async atualizarEstatisticas(id: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ estatisticas })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar estatísticas do usuário.', this.toError(error));
      throw error;
    }
  }

  async atualizarEstatisticasPorAuthUserId(authUserId: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ estatisticas })
        .eq('auth_user_id', authUserId);

      if (error) throw error;
    } catch (error) {
      await this.logService.erro('Erro ao atualizar estatísticas do usuário por Auth User ID.', this.toError(error));
      throw error;
    }
  }

  async buscarUsuariosAtivos(): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('ativo', true);

      if (error) throw error;
      return (data as Usuario[]) ?? [];
    } catch (error) {
      await this.logService.erro('Erro ao buscar usuários ativos.', this.toError(error));
      throw error;
    }
  }

  async buscarUsuariosPorConcurso(concursoId: string): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('concurso_id', concursoId)
        .eq('ativo', true);

      if (error) throw error;
      return (data as Usuario[]) ?? [];
    } catch (error) {
      await this.logService.erro('Erro ao buscar usuários por concurso.', this.toError(error));
      throw error;
    }
  }

  async obterEstatisticasUsuario(id: string): Promise<EstatisticasUsuario> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('estatisticas')
        .eq('id', id)
        .single();

      if (error) throw error;

      const estatisticas = data?.estatisticas as EstatisticasUsuario;
      if (!estatisticas) {
        return {
          total_simulados_realizados: 0,
          media_pontuacao_simulados: 0,
          total_questoes_semanais_respondidas: 0,
          total_flashcards_dominados: 0,
          total_apostilas_concluidas: 0,
          tempo_total_estudo_horas: 0,
          sequencia_dias_estudo: 0,
          ultima_atividade: new Date(),
          total_acertos: 0,
        };
      }

      return estatisticas;
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas do usuário.', this.toError(error));
      throw error;
    }
  }

  private async calcularSequenciaDiasEstudo(usuarioId: string): Promise<number> {
    try {
      // Buscar logs de atividade dos últimos 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const { data, error } = await supabase
        .from('logs_atividade')
        .select('data_atividade')
        .eq('usuario_id', usuarioId)
        .gte('data_atividade', trintaDiasAtras.toISOString())
        .order('data_atividade', { ascending: false });

      if (error) throw error;

      const datas = (data as Array<{ data_atividade: string }>) ?? [];
      if (datas.length === 0) return 0;

      // Calcular sequência de dias consecutivos
      let sequenciaAtual = 0;
      let sequenciaMaxima = 0;
      let dataAnterior: Date | null = null;

      for (const log of datas) {
        const dataAtual = new Date(log.data_atividade);
        
        if (dataAnterior === null) {
          sequenciaAtual = 1;
        } else {
          const diffDias = Math.floor((dataAnterior.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDias === 1) {
            sequenciaAtual++;
          } else {
            sequenciaMaxima = Math.max(sequenciaMaxima, sequenciaAtual);
            sequenciaAtual = 1;
          }
        }
        
        dataAnterior = dataAtual;
      }

      return Math.max(sequenciaMaxima, sequenciaAtual);
    } catch (error) {
      await this.logService.erro('Erro ao calcular sequência de dias de estudo.', this.toError(error));
      return 0;
    }
  }

  private async obterUltimaAtividade(usuarioId: string): Promise<Date> {
    try {
      const { data, error } = await supabase
        .from('logs_atividade')
        .select('data_atividade')
        .eq('usuario_id', usuarioId)
        .order('data_atividade', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      return data ? new Date(data.data_atividade) : new Date();
    } catch (error) {
      await this.logService.erro('Erro ao obter última atividade.', this.toError(error));
      return new Date();
    }
  }

  async marcarPrimeiroLoginCompleto(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ primeiro_login: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      await this.logService.erro('Erro ao marcar primeiro login como completo.', this.toError(error));
      throw error;
    }
  }

  async obterUsuariosComPrimeiroLogin(): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('primeiro_login', true);

      if (error) throw error;
      return (data as Usuario[]) ?? [];
    } catch (error) {
      await this.logService.erro('Erro ao obter usuários com primeiro login.', this.toError(error));
      throw error;
    }
  }
}

export default UsuarioRepository;




