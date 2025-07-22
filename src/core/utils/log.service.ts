// Serviço de logs para o AprovaFácil
import { ILogService } from '../interfaces/index.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class LogService implements ILogService {
  private supabase: SupabaseClient;
  private contexto: string;

  constructor(supabase: SupabaseClient, contexto: string = 'SISTEMA') {
    this.supabase = supabase;
    this.contexto = contexto;
  }

  async info(mensagem: string, detalhes?: unknown): Promise<void> {
    await this.logarEvento('INFO', mensagem, detalhes);
    console.log(`[INFO] ${this.contexto}: ${mensagem}`, detalhes || '');
  }

  async erro(mensagem: string, erro?: Error, detalhes?: unknown): Promise<void> {
    const detalhesCompletos = {
      ...(typeof detalhes === 'object' && detalhes !== null ? detalhes : {}),
      stack: erro?.stack,
      name: erro?.name,
      message: erro?.message
    };
    
    await this.logarEvento('ERROR', mensagem, detalhesCompletos);
    console.error(`[ERROR] ${this.contexto}: ${mensagem}`, erro, detalhes || '');
  }

  async aviso(mensagem: string, detalhes?: unknown): Promise<void> {
    await this.logarEvento('WARN', mensagem, detalhes);
    console.warn(`[WARN] ${this.contexto}: ${mensagem}`, detalhes || '');
  }

  async debug(mensagem: string, detalhes?: unknown): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      await this.logarEvento('DEBUG', mensagem, detalhes);
      console.debug(`[DEBUG] ${this.contexto}: ${mensagem}`, detalhes || '');
    }
  }

  async auditoria(
    acao: string, 
    tabela: string, 
    dadosAntigos?: unknown, 
    dadosNovos?: unknown, 
    usuarioId?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('logs_auditoria')
        .insert({
          usuario_id: usuarioId,
          acao,
          nome_tabela: tabela,
          valores_antigos: dadosAntigos,
          valores_novos: dadosNovos,
          criado_em: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao registrar log de auditoria:', error);
      }
    } catch (error) {
      console.error('Erro inesperado ao registrar log de auditoria:', error);
    }
  }

  private async logarEvento(nivel: string, mensagem: string, detalhes?: unknown): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('historico_logs')
        .insert({
          nivel,
          servico: this.contexto,
          mensagem,
          detalhes: detalhes ? JSON.stringify(detalhes) : null,
          criado_em: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao salvar log no banco:', error);
      }
    } catch (error) {
      // Não fazer nada para evitar loop infinito de logs
      console.error('Erro crítico no sistema de logs:', error);
    }
  }

  // Métodos utilitários para logs específicos
  async logarInicioOperacao(operacao: string, parametros?: unknown): Promise<void> {
    await this.info(`Iniciando operação: ${operacao}`, { parametros });
  }

  async logarFimOperacao(operacao: string, resultado?: unknown, tempoExecucao?: number): Promise<void> {
    await this.info(`Operação concluída: ${operacao}`, { 
      resultado: resultado ? 'sucesso' : 'falha',
      tempo_execucao_ms: tempoExecucao 
    });
  }

  async logarAcessoUsuario(usuarioId: string, acao: string, ip?: string, userAgent?: string): Promise<void> {
    await this.info(`Acesso do usuário: ${acao}`, {
      usuario_id: usuarioId,
      endereco_ip: ip,
      user_agent: userAgent
    });
  }

  async logarPerformance(operacao: string, tempoExecucao: number, detalhes?: unknown): Promise<void> {
    const nivel = tempoExecucao > 5000 ? 'WARN' : 'INFO';
    const mensagem = `Performance ${operacao}: ${tempoExecucao}ms`;
    
    if (nivel === 'WARN') {
      await this.aviso(mensagem, detalhes);
    } else {
      await this.info(mensagem, detalhes);
    }
  }

  async logarErroValidacao(campo: string, valor: unknown, regra: string): Promise<void> {
    await this.aviso(`Erro de validação no campo ${campo}`, {
      campo,
      valor,
      regra_violada: regra
    });
  }

  async logarTentativaLogin(email: string, sucesso: boolean, ip?: string): Promise<void> {
    const mensagem = sucesso ? 'Login realizado com sucesso' : 'Tentativa de login falhada';
    const metodo = sucesso ? this.info : this.aviso;
    
    await metodo.call(this, mensagem, {
      email,
      endereco_ip: ip,
      sucesso
    });
  }

  async logarAlteracaoSenha(usuarioId: string, ip?: string): Promise<void> {
    await this.info('Senha alterada pelo usuário', {
      usuario_id: usuarioId,
      endereco_ip: ip
    });
  }

  async logarCriacaoConteudo(tipo: string, id: string, usuarioId?: string): Promise<void> {
    await this.info(`Novo conteúdo criado: ${tipo}`, {
      tipo_conteudo: tipo,
      conteudo_id: id,
      criado_por: usuarioId
    });
  }

  async logarExclusaoConteudo(tipo: string, id: string, usuarioId?: string): Promise<void> {
    await this.aviso(`Conteúdo excluído: ${tipo}`, {
      tipo_conteudo: tipo,
      conteudo_id: id,
      excluido_por: usuarioId
    });
  }

  async logarOperacaoCache(operacao: string, chave: string, sucesso: boolean): Promise<void> {
    const mensagem = `Operação de cache ${operacao}: ${chave}`;
    const metodo = sucesso ? this.debug : this.aviso;
    
    await metodo.call(this, mensagem, {
      operacao_cache: operacao,
      chave_cache: chave,
      sucesso
    });
  }

  async logarConexaoBanco(sucesso: boolean, tempoResposta?: number): Promise<void> {
    const mensagem = sucesso ? 'Conexão com banco estabelecida' : 'Falha na conexão com banco';
    const metodo = sucesso ? this.info : this.erro;
    
    await metodo.call(this, mensagem, {
      conexao_banco: sucesso,
      tempo_resposta_ms: tempoResposta
    });
  }

  // Método para obter logs com filtros
  async obterLogs(filtros: {
    nivel?: string;
    servico?: string;
    dataInicio?: Date;
    dataFim?: Date;
    limite?: number;
    pagina?: number;
  } = {}): Promise<{
    logs: Record<string, unknown>[];
    total: number;
  }> {
    try {
      let query = this.supabase
        .from('historico_logs')
        .select('*', { count: 'exact' });

      if (filtros.nivel) {
        query = query.eq('nivel', filtros.nivel);
      }

      if (filtros.servico) {
        query = query.eq('servico', filtros.servico);
      }

      if (filtros.dataInicio) {
        query = query.gte('criado_em', filtros.dataInicio.toISOString());
      }

      if (filtros.dataFim) {
        query = query.lte('criado_em', filtros.dataFim.toISOString());
      }

      query = query.order('criado_em', { ascending: false });

      if (filtros.limite) {
        query = query.limit(filtros.limite);
      }

      if (filtros.pagina && filtros.limite) {
        const offset = (filtros.pagina - 1) * filtros.limite;
        query = query.range(offset, offset + filtros.limite - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        logs: Array.isArray(data) ? data : [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      return { logs: [], total: 0 };
    }
  }

  // Método para limpar logs antigos
  async limparLogsAntigos(diasParaManter: number = 30): Promise<number> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - diasParaManter);

      const { data, error } = await this.supabase
        .from('historico_logs')
        .delete()
        .lt('criado_em', dataLimite.toISOString());

      if (error) {
        throw error;
      }

      if (!data || !Array.isArray(data)) {
        return 0;
      }
      const registrosRemovidos = (data as unknown as Record<string, unknown>[]).length;
      await this.info(`Limpeza de logs concluída: ${registrosRemovidos} registros removidos`);
      
      return registrosRemovidos;
    } catch (error) {
      await this.erro('Erro ao limpar logs antigos', error as Error);
      return 0;
    }
  }

  // Método para obter estatísticas de logs
  async obterEstatisticasLogs(): Promise<{
    total_logs: number;
    logs_por_nivel: Record<string, number>;
    logs_por_servico: Record<string, number>;
    ultimo_log: Date | null;
  }> {
    try {
      const { data: totalData } = await this.supabase
        .from('historico_logs')
        .select('id', { count: 'exact', head: true });

      const { data: nivelData } = await this.supabase
        .from('historico_logs')
        .select('nivel')
        .order('nivel');

      const { data: servicoData } = await this.supabase
        .from('historico_logs')
        .select('servico')
        .order('servico');

      const { data: ultimoLogData } = await this.supabase
        .from('historico_logs')
        .select('criado_em')
        .order('criado_em', { ascending: false })
        .limit(1);

      // Contar logs por nível
      const logsPorNivel: Record<string, number> = {};
      nivelData?.forEach(log => {
        logsPorNivel[log.nivel] = (logsPorNivel[log.nivel] || 0) + 1;
      });

      // Contar logs por serviço
      const logsPorServico: Record<string, number> = {};
      servicoData?.forEach(log => {
        logsPorServico[log.servico] = (logsPorServico[log.servico] || 0) + 1;
      });

      return {
        total_logs: totalData?.length || 0,
        logs_por_nivel: logsPorNivel,
        logs_por_servico: logsPorServico,
        ultimo_log: ultimoLogData?.[0]?.criado_em ? new Date(ultimoLogData[0].criado_em) : null
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de logs:', error);
      return {
        total_logs: 0,
        logs_por_nivel: {},
        logs_por_servico: {},
        ultimo_log: null
      };
    }
  }
}

export default LogService;




