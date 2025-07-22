// Repositório de usuários para o AprovaFácil
import { IUsuarioRepository, ILogService } from '../../core/interfaces/index.js';
import { BaseSupabaseRepository } from '../../core/database/supabase.js';
import { Usuario, FiltroBase, PaginatedResponse, EstatisticasUsuario } from '../../shared/types/index.js';
import { UsuarioNaoEncontradoError, EmailJaExisteError } from '../../core/errors/usuario-errors.js';

export class UsuarioRepository extends BaseSupabaseRepository implements IUsuarioRepository {
  constructor(logService: ILogService) {
    super('usuarios', logService);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.executarQuery('buscarPorId', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    });
  }

  async buscarPorAuthUserId(authUserId: string): Promise<Usuario | null> {
    return this.executarQuery('buscarPorAuthUserId', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();
      return { data, error };
    });
  }

  async buscarTodos(filtro?: FiltroBase): Promise<PaginatedResponse<Usuario>> {
    const { dados, total } = await this.executarQueryLista('buscarTodos', async () => {
      let query = this.supabase
        .from('usuarios')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtro) {
        query = this.aplicarFiltros(query, filtro);
        
        if (filtro.search) {
          query = query.or(`nome.ilike.%${filtro.search}%,email.ilike.%${filtro.search}%`);
        }
      }

      const { data, error, count } = await query;
      return { data, error, count };
    });

    const page = filtro?.page || 1;
    const limit = filtro?.limit || 10;
    const totalPages = Math.ceil((total || 0) / limit);

    return {
      success: true,
      data: dados,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages
      }
    };
  }

  async criar(dados: Partial<Usuario>): Promise<Usuario> {
    // Verificar se email já existe
    if (dados.email) {
      const usuarioExistente = await this.buscarPorEmail(dados.email);
      if (usuarioExistente) {
        throw new EmailJaExisteError(dados.email);
      }
    }

    return this.executarMutacao('criar', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .insert({
          ...dados,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      return { data, error };
    });
  }

  async atualizar(id: string, dados: Partial<Usuario>): Promise<Usuario> {
    // Verificar se usuário existe
    const usuarioExistente = await this.buscarPorId(id);
    if (!usuarioExistente) {
      throw new UsuarioNaoEncontradoError(id);
    }

    // Verificar se email já existe (se estiver sendo alterado)
    if (dados.email && dados.email !== usuarioExistente.email) {
      const usuarioComEmail = await this.buscarPorEmail(dados.email);
      if (usuarioComEmail && usuarioComEmail.id !== id) {
        throw new EmailJaExisteError(dados.email);
      }
    }

    return this.executarMutacao('atualizar', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update({
          ...dados,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    });
  }

  async atualizarPorAuthUserId(authUserId: string, dados: Partial<Usuario>): Promise<Usuario> {
    // Verificar se usuário existe
    const usuarioExistente = await this.buscarPorAuthUserId(authUserId);
    if (!usuarioExistente) {
      throw new UsuarioNaoEncontradoError(authUserId);
    }
    // Verificar se email já existe (se estiver sendo alterado)
    if (dados.email && dados.email !== usuarioExistente.email) {
      const usuarioComEmail = await this.buscarPorEmail(dados.email);
      if (usuarioComEmail && usuarioComEmail.auth_user_id !== authUserId) {
        throw new EmailJaExisteError(dados.email);
      }
    }
    return this.executarMutacao('atualizarPorAuthUserId', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update({
          ...dados,
          atualizado_em: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId)
        .select()
        .single();
      return { data, error };
    });
  }

  async excluir(id: string): Promise<boolean> {
    // Verificar se usuário existe
    const usuarioExistente = await this.buscarPorId(id);
    if (!usuarioExistente) {
      throw new UsuarioNaoEncontradoError(id);
    }

    await this.executarMutacao('excluir', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    });

    return true;
  }

  async excluirPorAuthUserId(authUserId: string): Promise<boolean> {
    const usuarioExistente = await this.buscarPorAuthUserId(authUserId);
    if (!usuarioExistente) {
      throw new UsuarioNaoEncontradoError(authUserId);
    }
    await this.executarMutacao('excluirPorAuthUserId', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('auth_user_id', authUserId)
        .select()
        .single();
      return { data, error };
    });
    return true;
  }

  async existePorId(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id')
        .eq('id', id)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*, senha_hash') // Garantir que senha_hash seja retornado
        .eq('email', email)
        .single();

      console.log('[DEBUG] Usuario retornado por buscarPorEmail:', data); // Log para depuração

      if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
        await this.logService.erro('Erro ao buscar usuário por email', error, { email });
        return null;
      }

      return data;
    } catch (error) {
      await this.logService.erro('Erro inesperado ao buscar usuário por email', error as Error, { email });
      return null;
    }
  }

  async atualizarUltimoLogin(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ 
          ultimo_login: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        await this.logService.erro('Erro ao atualizar último login', error, { id });
      }
    } catch (error) {
      await this.logService.erro('Erro inesperado ao atualizar último login', error as Error, { id });
    }
  }

  async atualizarUltimoLoginPorAuthUserId(authUserId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ 
          ultimo_login: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);
      if (error) {
        await this.logService.erro('Erro ao atualizar último login', error, { authUserId });
      }
    } catch (error) {
      await this.logService.erro('Erro inesperado ao atualizar último login', error as Error, { authUserId });
    }
  }

  async atualizarEstatisticas(id: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void> {
    try {
      const dadosAtualizacao: Partial<Usuario> = {};

      if (estatisticas.total_simulados_realizados !== undefined) {
        // Buscar estatísticas atuais para incrementar
        const usuario = await this.buscarPorId(id);
        if (usuario) {
          dadosAtualizacao.total_questoes_respondidas = 
            (usuario.total_questoes_respondidas || 0) + (estatisticas.total_simulados_realizados || 0);
        }
      }

      if (estatisticas.total_acertos !== undefined) {
        dadosAtualizacao.total_acertos = estatisticas.total_acertos;
      }

      if (estatisticas.tempo_total_estudo_horas !== undefined) {
        dadosAtualizacao.tempo_estudo_minutos = estatisticas.tempo_total_estudo_horas * 60;
      }

      if (estatisticas.media_pontuacao_simulados !== undefined) {
        dadosAtualizacao.pontuacao_media = estatisticas.media_pontuacao_simulados;
      }

      const { error } = await this.supabase
        .from('usuarios')
        .update(dadosAtualizacao)
        .eq('id', id);

      if (error) {
        await this.logService.erro('Erro ao atualizar estatísticas do usuário', error, { id, estatisticas });
      }
    } catch (error) {
      await this.logService.erro('Erro inesperado ao atualizar estatísticas do usuário', error as Error, { id, estatisticas });
    }
  }

  async atualizarEstatisticasPorAuthUserId(authUserId: string, estatisticas: Partial<EstatisticasUsuario>): Promise<void> {
    try {
      const dadosAtualizacao: Partial<Usuario> = {};
      if (estatisticas.total_simulados_realizados !== undefined) {
        const usuario = await this.buscarPorAuthUserId(authUserId);
        if (usuario) {
          dadosAtualizacao.total_questoes_respondidas = 
            (usuario.total_questoes_respondidas || 0) + (estatisticas.total_simulados_realizados || 0);
        }
      }
      if (estatisticas.total_acertos !== undefined) {
        dadosAtualizacao.total_acertos = estatisticas.total_acertos;
      }
      if (estatisticas.tempo_total_estudo_horas !== undefined) {
        dadosAtualizacao.tempo_estudo_minutos = estatisticas.tempo_total_estudo_horas * 60;
      }
      if (estatisticas.media_pontuacao_simulados !== undefined) {
        dadosAtualizacao.pontuacao_media = estatisticas.media_pontuacao_simulados;
      }
      const { error } = await this.supabase
        .from('usuarios')
        .update(dadosAtualizacao)
        .eq('auth_user_id', authUserId);
      if (error) {
        await this.logService.erro('Erro ao atualizar estatísticas do usuário', error, { authUserId, estatisticas });
      }
    } catch (error) {
      await this.logService.erro('Erro inesperado ao atualizar estatísticas do usuário', error as Error, { authUserId, estatisticas });
    }
  }

  // Métodos específicos para usuários

  async buscarUsuariosAtivos(): Promise<Usuario[]> {
    const { dados } = await this.executarQueryLista('buscarUsuariosAtivos', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      return { data, error };
    });

    return dados;
  }

  async buscarUsuariosPorConcurso(concursoId: string): Promise<Usuario[]> {
    const { dados } = await this.executarQueryLista('buscarUsuariosPorConcurso', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select(`
          *,
          preferencias_usuario_concurso!inner(concurso_id)
        `)
        .eq('preferencias_usuario_concurso.concurso_id', concursoId)
        .eq('preferencias_usuario_concurso.ativo', true)
        .eq('ativo', true);

      return { data, error };
    });

    return dados;
  }

  async obterEstatisticasUsuario(id: string): Promise<EstatisticasUsuario> {
    try {
      // Buscar dados básicos do usuário
      const usuario = await this.buscarPorId(id);
      if (!usuario) {
        throw new UsuarioNaoEncontradoError(id);
      }

      // Buscar estatísticas de simulados
      const { data: simuladosData } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('pontuacao, concluido_em')
        .eq('usuario_id', id);

      // Buscar estatísticas de questões semanais
      const { data: questoesData } = await this.supabase
        .from('progresso_usuario_questoes_semanais')
        .select('total_questoes, pontuacao')
        .eq('usuario_id', id);

      // Buscar estatísticas de flashcards
      const { data: flashcardsData } = await this.supabase
        .from('progresso_usuario_flashcard')
        .select('status')
        .eq('usuario_id', id);

      // Buscar estatísticas de apostilas
      const { data: apostilasData } = await this.supabase
        .from('progresso_usuario_apostila')
        .select('concluido')
        .eq('usuario_id', id);

      // Calcular estatísticas
      const totalSimuladosRealizados = simuladosData?.length || 0;
      const mediaPontuacaoSimulados = simuladosData?.length 
        ? simuladosData.reduce((acc, s) => acc + s.pontuacao, 0) / simuladosData.length 
        : 0;

      const totalQuestoesSemanaisRespondidas = questoesData?.reduce((acc, q) => acc + q.total_questoes, 0) || 0;

      const totalFlashcardsDominados = flashcardsData?.filter(f => f.status === 'dominado').length || 0;

      const totalApostilasConcluidias = apostilasData?.filter(a => a.concluido).length || 0;

      // Calcular sequência de dias de estudo
      const sequenciaDiasEstudo = await this.calcularSequenciaDiasEstudo(id);

      // Buscar última atividade
      const ultimaAtividade = await this.obterUltimaAtividade(id);

      return {
        total_simulados_realizados: totalSimuladosRealizados,
        media_pontuacao_simulados: Math.round(mediaPontuacaoSimulados * 100) / 100,
        total_questoes_semanais_respondidas: totalQuestoesSemanaisRespondidas,
        total_flashcards_dominados: totalFlashcardsDominados,
        total_apostilas_concluidas: totalApostilasConcluidias,
        tempo_total_estudo_horas: Math.round((usuario.tempo_estudo_minutos || 0) / 60 * 100) / 100,
        sequencia_dias_estudo: sequenciaDiasEstudo,
        ultima_atividade: ultimaAtividade,
        total_acertos: 0 // TODO: calcular se necessário
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas do usuário', error as Error, { id });
      throw error;
    }
  }

  private async calcularSequenciaDiasEstudo(usuarioId: string): Promise<number> {
    try {
      // Buscar atividades dos últimos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('concluido_em')
        .eq('usuario_id', usuarioId)
        .gte('concluido_em', dataLimite.toISOString())
        .order('concluido_em', { ascending: false });

      if (!data || data.length === 0) {
        return 0;
      }

      // Agrupar por dia e calcular sequência
      const diasComAtividade = new Set();
      data.forEach(item => {
        if (item.concluido_em) {
          const dia = new Date(item.concluido_em).toDateString();
          diasComAtividade.add(dia);
        }
      });

      // Calcular sequência consecutiva a partir de hoje
      let sequencia = 0;
      const hoje = new Date();
      
      for (let i = 0; i < 30; i++) {
        const dia = new Date(hoje);
        dia.setDate(dia.getDate() - i);
        const diaString = dia.toDateString();
        
        if (diasComAtividade.has(diaString)) {
          sequencia++;
        } else {
          break;
        }
      }

      return sequencia;
    } catch (error) {
      await this.logService.erro('Erro ao calcular sequência de dias de estudo', error as Error, { usuarioId });
      return 0;
    }
  }

  private async obterUltimaAtividade(usuarioId: string): Promise<Date> {
    try {
      const { data } = await this.supabase
        .from('progresso_usuario_simulado')
        .select('concluido_em')
        .eq('usuario_id', usuarioId)
        .order('concluido_em', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].concluido_em) {
        return new Date(data[0].concluido_em);
      }

      // Se não há atividade em simulados, verificar outras atividades
      const usuario = await this.buscarPorId(usuarioId);
      return usuario?.ultimo_login || usuario?.criado_em || new Date();
    } catch (error) {
      await this.logService.erro('Erro ao obter última atividade', error as Error, { usuarioId });
      return new Date();
    }
  }

  async marcarPrimeiroLoginCompleto(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({ 
          primeiro_login: false,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        await this.logService.erro('Erro ao marcar primeiro login como completo', error, { id });
        throw error;
      }

      await this.logService.info('Primeiro login marcado como completo', { usuarioId: id });
    } catch (error) {
      await this.logService.erro('Erro inesperado ao marcar primeiro login como completo', error as Error, { id });
      throw error;
    }
  }

  async obterUsuariosComPrimeiroLogin(): Promise<Usuario[]> {
    const { dados } = await this.executarQueryLista('obterUsuariosComPrimeiroLogin', async () => {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('primeiro_login', true)
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      return { data, error };
    });

    return dados;
  }
}

export default UsuarioRepository;




