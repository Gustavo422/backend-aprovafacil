// Serviço de logs para o AprovaFácil
import type { ILogService } from '../interfaces/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export class LogService implements ILogService {
  private readonly supabase: SupabaseClient;
  private readonly contexto: string;

  constructor(supabase: SupabaseClient, contexto = 'SISTEMA') {
    this.supabase = supabase;
    this.contexto = contexto;
  }

  async info(mensagem: string, detalhes?: unknown): Promise<void> {
    const safe = this.sanitizeDetails(detalhes);
    await this.logarEvento('INFO', mensagem, safe);
    console.log(`[INFO] ${this.contexto}: ${mensagem}`, safe ?? '');
  }

  async erro(mensagem: string, erro?: Error, detalhes?: unknown): Promise<void> {
    const detalhesCompletos = {
      ...(typeof detalhes === 'object' && detalhes !== null ? detalhes : {}),
      stack: erro?.stack,
      name: erro?.name,
      message: erro?.message,
    };
    const safe = this.sanitizeDetails(detalhesCompletos);
    await this.logarEvento('ERROR', mensagem, safe);
    console.error(`[ERROR] ${this.contexto}: ${mensagem}`, erro, safe ?? '');
  }

  async aviso(mensagem: string, detalhes?: unknown): Promise<void> {
    const safe = this.sanitizeDetails(detalhes);
    await this.logarEvento('WARN', mensagem, safe);
    console.warn(`[WARN] ${this.contexto}: ${mensagem}`, safe ?? '');
  }

  async debug(mensagem: string, detalhes?: unknown): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      const safe = this.sanitizeDetails(detalhes);
      await this.logarEvento('DEBUG', mensagem, safe);
      console.debug(`[DEBUG] ${this.contexto}: ${mensagem}`, safe ?? '');
    }
  }

  async auditoria(
    acao: string, 
    tabela: string, 
    dadosAntigos?: unknown, 
    dadosNovos?: unknown, 
    usuarioId?: string,
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
          criado_em: new Date().toISOString(),
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
      const safe = this.sanitizeDetails(detalhes);
      const { error } = await this.supabase
        .from('historico_logs')
        .insert({
          nivel,
          servico: this.contexto,
          mensagem,
          detalhes: safe ? JSON.stringify(safe) : null,
          criado_em: new Date().toISOString(),
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
      tempo_execucao_ms: tempoExecucao, 
    });
  }

  async logarAcessoUsuario(usuarioId: string, acao: string, ip?: string, userAgent?: string): Promise<void> {
    await this.info(`Acesso do usuário: ${acao}`, {
      usuario_id: usuarioId,
      endereco_ip: ip,
      user_agent: userAgent,
    });
  }

  async logarPerformance(operacao: string, tempoExecucao: number, detalhes?: unknown): Promise<void> {
    const nivel = tempoExecucao > 5000 ? 'WARN' : 'INFO';
    const mensagem = `Performance ${operacao}: ${tempoExecucao}ms`;
    
    if (nivel === 'WARN') {
      await this.aviso(mensagem, this.sanitizeDetails(detalhes));
    } else {
      await this.info(mensagem, this.sanitizeDetails(detalhes));
    }
  }

  async logarErroValidacao(campo: string, valor: unknown, regra: string): Promise<void> {
    await this.aviso(`Erro de validação no campo ${campo}`, {
      campo,
      valor,
      regra_violada: regra,
    });
  }

  async logarTentativaLogin(email: string, sucesso: boolean, ip?: string): Promise<void> {
    const mensagem = sucesso ? 'Login realizado com sucesso' : 'Tentativa de login falhada';
    const metodo = sucesso ? this.info.bind(this) : this.aviso.bind(this);
    
    await metodo(mensagem, {
      email,
      endereco_ip: ip,
      sucesso,
    });
  }

  async logarAlteracaoSenha(usuarioId: string, ip?: string): Promise<void> {
    await this.info('Senha alterada pelo usuário', {
      usuario_id: usuarioId,
      endereco_ip: ip,
    });
  }

  async logarCriacaoConteudo(tipo: string, id: string, usuarioId?: string): Promise<void> {
    await this.info(`Novo conteúdo criado: ${tipo}`, {
      tipo_conteudo: tipo,
      conteudo_id: id,
      criado_por: usuarioId,
    });
  }

  async logarExclusaoConteudo(tipo: string, id: string, usuarioId?: string): Promise<void> {
    await this.aviso(`Conteúdo excluído: ${tipo}`, {
      tipo_conteudo: tipo,
      conteudo_id: id,
      excluido_por: usuarioId,
    });
  }

  async logarOperacaoCache(operacao: string, chave: string, sucesso: boolean): Promise<void> {
    const mensagem = `Operação de cache ${operacao}: ${chave}`;
    const metodo = sucesso ? this.debug.bind(this) : this.aviso.bind(this);
    
    await metodo(mensagem, {
      operacao_cache: operacao,
      chave_cache: chave,
      sucesso,
    });
  }

  async logarConexaoBanco(sucesso: boolean, tempoResposta?: number): Promise<void> {
    const mensagem = sucesso ? 'Conexão com banco estabelecida' : 'Falha na conexão com banco';
    const metodo = sucesso ? this.info.bind(this) : this.erro.bind(this);
    
    const detalhes = {
      conexao_banco: sucesso,
      tempo_resposta_ms: tempoResposta,
    };
    
    if (sucesso) {
      await this.info(mensagem, detalhes);
    } else {
      await this.erro(mensagem, undefined, detalhes);
    }
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
        total: count ?? 0,
      };
    } catch (error) {
       
      console.error('Erro ao obter logs:', error);
      return { logs: [], total: 0 };
    }
  }

  // Método para limpar logs antigos
  async limparLogsAntigos(diasParaManter = 30): Promise<number> {
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
      const registrosRemovidos = (data as Record<string, unknown>[]).length;
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
      nivelData?.forEach((log: Record<string, unknown>) => {
        const nivel = log.nivel as string;
        logsPorNivel[nivel] = (logsPorNivel[nivel] ?? 0) + 1;
      });

      // Contar logs por serviço
      const logsPorServico: Record<string, number> = {};
      servicoData?.forEach((log: Record<string, unknown>) => {
        const servico = log.servico as string;
        logsPorServico[servico] = (logsPorServico[servico] ?? 0) + 1;
      });

      return {
        total_logs: totalData?.length ?? 0,
        logs_por_nivel: logsPorNivel,
        logs_por_servico: logsPorServico,
        ultimo_log: ultimoLogData?.[0]?.criado_em ? new Date(ultimoLogData[0].criado_em as string) : null,
      };
    } catch (error) {
       
      console.error('Erro ao obter estatísticas de logs:', error);
      return {
        total_logs: 0,
        logs_por_nivel: {},
        logs_por_servico: {},
        ultimo_log: null,
      };
    }
  }

  // Sanitização de PII e segredos em estruturas arbitrárias
  private sanitizeDetails(input: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
    if (input == null) return input;
    if (depth > 4) return '[Truncated]';

    const sensitiveKeyPatterns = [
      /authorization/i,
      /cookie/i,
      /set-cookie/i,
      /token/i,
      /senha/i,
      /password/i,
      /secret/i,
      /access.?token/i,
      /refresh.?token/i,
      /bearer/i,
    ];

    const piiKeyPatterns = [
      /email/i,
      /nome/i,
      /name/i,
      /cpf/i,
    ];

    const maskEmail = (value: string): string => {
      const [local = '', domain = ''] = String(value).split('@');
      if (!local || !domain) return '[masked]';
      const safeUser = local.length <= 2
        ? '*'.repeat(local.length)
        : local.slice(0, 2) + '*'.repeat(local.length - 2);
      return `${safeUser}@${domain}`;
    };

    const safeString = (s: string): string => (s.length > 2048 ? `${s.slice(0, 2048)}…[truncated]` : s);

    if (typeof input === 'string') return safeString(input);
    if (typeof input !== 'object') return input;

    const obj = input as Record<string, unknown> | unknown[];
    if (seen.has(obj as object)) return '[Circular]';
    seen.add(obj as object);

    if (Array.isArray(obj)) {
      return obj.slice(0, 50).map((v) => this.sanitizeDetails(v, depth + 1, seen));
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = sensitiveKeyPatterns.some((re) => re.test(key));
      if (isSensitive) {
        out[key] = '[redacted]';
        continue;
      }

      const isPii = piiKeyPatterns.some((re) => re.test(key));
      if (isPii && typeof value === 'string') {
        out[key] = maskEmail(value);
        continue;
      }

      out[key] = this.sanitizeDetails(value, depth + 1, seen);
    }
    return out;
  }
}

export default LogService;

/**
 * Factory function para criar instância do LogService
 */
export const createLogService = (supabase: SupabaseClient, contexto = 'SISTEMA'): LogService => {
  return new LogService(supabase, contexto);
};