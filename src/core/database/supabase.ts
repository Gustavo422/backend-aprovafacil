// Configuração do Supabase para o AprovaFácil
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ILogService } from '../interfaces/index.js';

export class SupabaseConfig {
  private static instance: SupabaseClient;
  private static logService: ILogService;

  public static getInstance(logService?: ILogService): SupabaseClient {
    if (!SupabaseConfig.instance) {
      const supabaseUrl = process.env.SUPABASE_URL;
      // Priorizar service_role para o backend
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Variáveis de ambiente do Supabase não configuradas');
      }

      SupabaseConfig.instance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      });

      if (logService) {
        SupabaseConfig.logService = logService;
        logService.info('Conexão com Supabase estabelecida');
        logService.info(`Chave usada: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`);
      }
    }

    return SupabaseConfig.instance;
  }

  public static async testarConexao(): Promise<boolean> {
    try {
      const supabase = SupabaseConfig.getInstance();
      const { error } = await supabase
        .from('usuarios')
        .select('count')
        .limit(1);

      if (error) {
        if (SupabaseConfig.logService) {
          await SupabaseConfig.logService.erro('Erro ao testar conexão com Supabase', error);
        }
        return false;
      }

      if (SupabaseConfig.logService) {
        await SupabaseConfig.logService.info('Teste de conexão com Supabase bem-sucedido');
      }
      return true;
    } catch (error) {
      if (SupabaseConfig.logService) {
        await SupabaseConfig.logService.erro('Erro ao testar conexão com Supabase', error as Error);
      }
      return false;
    }
  }

  public static async obterEstatisticasConexao(): Promise<{
    status: 'conectado' | 'desconectado';
    tempo_resposta?: number;
    ultima_verificacao: Date;
  }> {
    const inicioTeste = Date.now();
    const conectado = await SupabaseConfig.testarConexao();
    const tempoResposta = Date.now() - inicioTeste;

    return {
      status: conectado ? 'conectado' : 'desconectado',
      tempo_resposta: conectado ? tempoResposta : undefined,
      ultima_verificacao: new Date()
    };
  }
}

// Classe base para repositórios que usam Supabase
export abstract class BaseSupabaseRepository {
  protected supabase: SupabaseClient;
  protected logService: ILogService;
  protected nomeTabela: string;

  constructor(nomeTabela: string, logService: ILogService) {
    this.supabase = SupabaseConfig.getInstance(logService);
    this.logService = logService;
    this.nomeTabela = nomeTabela;
  }

  protected async executarQuery<T>(
    operacao: string,
    query: () => Promise<{ data: T | null; error: unknown }>
  ): Promise<T> {
    try {
      const { data, error } = await query();

      if (error) {
        if (this.logService && typeof this.logService.erro === 'function') {
          await this.logService.erro(
            `Erro na operação ${operacao} na tabela ${this.nomeTabela}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
        if (error instanceof Error) {
          throw new Error(`Erro na operação ${operacao}: ${error.message}`);
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as unknown as { message: string }).message === 'string') {
          throw new Error(`Erro na operação ${operacao}: ${(error as unknown as { message: string }).message}`);
        } else {
          throw new Error(`Erro na operação ${operacao}: ${String(error)}`);
        }
      }

      if (data === null) {
        throw new Error(`Nenhum resultado encontrado para a operação ${operacao}`);
      }

      await this.logService.debug(
        `Operação ${operacao} executada com sucesso na tabela ${this.nomeTabela}`
      );

      return data;
    } catch (error) {
      await this.logService.erro(
        `Erro inesperado na operação ${operacao} na tabela ${this.nomeTabela}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  protected async executarQueryLista<T>(
    operacao: string,
    query: () => Promise<{ data: T[] | null; error: unknown; count?: number }>
  ): Promise<{ dados: T[]; total?: number }> {
    try {
      const { data, error, count } = await query();

      if (error) {
        if (this.logService && typeof this.logService.erro === 'function') {
          await this.logService.erro(
            `Erro na operação ${operacao} na tabela ${this.nomeTabela}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
        if (error instanceof Error) {
          throw new Error(`Erro na operação ${operacao}: ${error.message}`);
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as unknown as { message: string }).message === 'string') {
          throw new Error(`Erro na operação ${operacao}: ${(error as unknown as { message: string }).message}`);
        } else {
          throw new Error(`Erro na operação ${operacao}: ${String(error)}`);
        }
      }

      await this.logService.debug(
        `Operação ${operacao} executada com sucesso na tabela ${this.nomeTabela}. ${data?.length || 0} registros retornados`
      );

      return {
        dados: data || [],
        total: count || undefined
      };
    } catch (error) {
      await this.logService.erro(
        `Erro inesperado na operação ${operacao} na tabela ${this.nomeTabela}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  protected async executarMutacao<T>(
    operacao: string,
    query: () => Promise<{ data: T | null; error: unknown }>
  ): Promise<T> {
    try {
      const { data, error } = await query();

      if (error) {
        if (this.logService && typeof this.logService.erro === 'function') {
          await this.logService.erro(
            `Erro na operação ${operacao} na tabela ${this.nomeTabela}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
        if (error instanceof Error) {
          throw new Error(`Erro na operação ${operacao}: ${error.message}`);
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as unknown as { message: string }).message === 'string') {
          throw new Error(`Erro na operação ${operacao}: ${(error as unknown as { message: string }).message}`);
        } else {
          throw new Error(`Erro na operação ${operacao}: ${String(error)}`);
        }
      }

      if (data === null) {
        throw new Error(`Falha na operação ${operacao}: nenhum dado retornado`);
      }

      await this.logService.info(
        `Operação ${operacao} executada com sucesso na tabela ${this.nomeTabela}`
      );

      return data;
    } catch (error) {
      await this.logService.erro(
        `Erro inesperado na operação ${operacao} na tabela ${this.nomeTabela}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  protected gerarSlug(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }

  protected aplicarFiltros<T>(query: T, filtros: unknown): T {
    if (typeof filtros === 'object' && filtros !== null) {
      const filtrosObj = filtros as Record<string, unknown>;
      if ('search' in filtrosObj) {
        // Implementar busca textual conforme necessário para cada tabela
      }
      interface QueryWithOrder {
        order(field: unknown, options: { ascending: boolean }): T;
      }
      if ('sort_by' in filtrosObj && 'sort_order' in filtrosObj && query && typeof query === 'object' && 'order' in query) {
        query = (query as unknown as QueryWithOrder).order(filtrosObj['sort_by'], { ascending: filtrosObj['sort_order'] === 'asc' });
      }
    }
    return query;
  }
}

// Utilitários para trabalhar com o Supabase
export class SupabaseUtils {
  public static formatarErroSupabase(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: string }).code;
      switch (code) {
        case '23505':
          return 'Registro duplicado. Este item já existe.';
        case '23503':
          return 'Referência inválida. Verifique os dados relacionados.';
        case '23502':
          return 'Campo obrigatório não preenchido.';
        case '42P01':
          return 'Tabela não encontrada.';
        case '42703':
          return 'Coluna não encontrada.';
        default:
          if ('message' in error && typeof (error as unknown as { message: string }).message === 'string') {
            return (error as unknown as { message: string }).message;
          }
          return 'Erro desconhecido no banco de dados.';
      }
    }
    if (error && typeof error === 'object' && 'message' in error && typeof (error as unknown as { message: string }).message === 'string') {
      return (error as unknown as { message: string }).message;
    }
    return 'Erro desconhecido.';
  }

  public static criarFiltroTexto(campo: string, valor: string): string {
    return `${campo}.ilike.%${valor}%`;
  }

  public static criarFiltroData(campo: string, dataInicio?: Date, dataFim?: Date): unknown {
    const filtros: Record<string, unknown> = {};

    if (dataInicio) {
      filtros[`${campo}_gte`] = dataInicio.toISOString();
    }

    if (dataFim) {
      filtros[`${campo}_lte`] = dataFim.toISOString();
    }

    return filtros;
  }

  public static validarUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

export default SupabaseConfig;




