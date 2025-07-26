/**
 * SupabaseConnectionManager
 * 
 * Classe responsável por gerenciar a conexão com o Supabase.
 * Esta classe é uma refatoração da classe SupabaseConfig existente,
 * com melhorias na gestão de conexão, status e configuração.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ILogService } from '../interfaces/index.js';

/**
 * Tipo de status da conexão
 */
export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

/**
 * Opções para o gerenciador de conexão
 */
export interface SupabaseConnectionOptions {
  /**
   * URL do Supabase
   */
  supabaseUrl?: string;
  
  /**
   * Chave do Supabase (anônima ou service role)
   */
  supabaseKey?: string;
  
  /**
   * Cliente Supabase existente
   */
  existingClient?: SupabaseClient;
  
  /**
   * Serviço de log
   */
  logService?: ILogService;
  
  /**
   * Configurações adicionais
   */
  options?: {
    /**
     * Auto refresh do token
     */
    autoRefreshToken?: boolean;
    
    /**
     * Persistir sessão
     */
    persistSession?: boolean;
    
    /**
     * Schema do banco de dados
     */
    schema?: string;
    
    /**
     * Headers adicionais
     */
    headers?: Record<string, string>;
  };
}

/**
 * Gerenciador de conexão com o Supabase
 */
export class SupabaseConnectionManager {
  /**
   * Cliente Supabase
   */
  private client: SupabaseClient;
  
  /**
   * URL do Supabase
   */
  private supabaseUrl: string;
  
  /**
   * Chave do Supabase
   */
  private supabaseKey: string;
  
  /**
   * Serviço de log
   */
  private logService?: ILogService;
  
  /**
   * Status da conexão
   */
  private connectionStatus: ConnectionStatus = 'DISCONNECTED';
  
  /**
   * Opções de configuração
   */
  private options: {
    autoRefreshToken: boolean;
    persistSession: boolean;
    schema: string;
    headers?: Record<string, string>;
  };
  
  /**
   * Construtor
   * @param options Opções de conexão
   */
  constructor(options: SupabaseConnectionOptions) {
    this.logService = options.logService;
    
    // Usar cliente existente ou criar novo
    if (options.existingClient) {
      this.client = options.existingClient;
      this.supabaseUrl = '';
      this.supabaseKey = '';
      this.options = {
        autoRefreshToken: true,
        persistSession: false,
        schema: 'public'
      };
      this.connectionStatus = 'CONNECTED';
      this.log('info', 'Usando cliente Supabase existente');
    } else {
      // Obter URL e chave do Supabase
      this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL || '';
      
      // Priorizar service_role para o backend se disponível
      this.supabaseKey = options.supabaseKey || 
        process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_ANON_KEY || '';
      
      // Verificar se as credenciais estão disponíveis
      if (!this.supabaseUrl || !this.supabaseKey) {
        this.log('erro', 'Credenciais do Supabase não configuradas');
        throw new Error('Credenciais do Supabase não configuradas');
      }
      
      // Configurar opções
      this.options = {
        autoRefreshToken: options.options?.autoRefreshToken ?? true,
        persistSession: options.options?.persistSession ?? false,
        schema: options.options?.schema ?? 'public',
        headers: options.options?.headers
      };
      
      // Criar cliente
      this.client = this.createClient();
      this.connectionStatus = 'CONNECTING';
      this.log('info', 'Cliente Supabase criado');
      
      // Verificar conexão
      this.checkConnection();
      if (this.connectionStatus === 'CONNECTING') {
        this.log('aviso', 'Conexão inicial falhou, tentando reconectar');
        this.reconnect();
      }
    }
  }
  
  /**
   * Obter cliente Supabase
   * @returns Cliente Supabase
   */
  public getClient(): SupabaseClient {
    return this.client;
  }
  
  /**
   * Resetar cliente Supabase
   */
  public resetClient(): void {
    this.log('info', 'Resetando cliente Supabase');
    this.client = this.createClient();
    this.connectionStatus = 'CONNECTING';
    this.checkConnection();
  }
  
  /**
   * Obter status da conexão
   * @returns Status da conexão
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Testar conexão com o Supabase
   * @returns True se conectado com sucesso
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.log('debug', 'Testando conexão com Supabase');
      
      // Tentar fazer uma consulta simples
      const { error } = await this.client
        .from('health_check')
        .select('count')
        .limit(1)
        .maybeSingle();
      
      // Se houver erro, tentar outra tabela comum
      if (error && error.code === '42P01') {
        this.log('debug', 'Tabela health_check não encontrada, tentando outra tabela');
        
        const { error: error2 } = await this.client
          .from('usuarios')
          .select('count')
          .limit(1)
          .maybeSingle();
        
        if (error2 && error2.code === '42P01') {
          this.log('debug', 'Tabela usuarios não encontrada, tentando outra tabela');
          
          // Tentar uma terceira tabela
          const { error: error3 } = await this.client
            .from('categorias')
            .select('count')
            .limit(1)
            .maybeSingle();
          
          if (error3 && error3.code === '42P01') {
            // Nenhuma tabela comum encontrada, mas a conexão pode estar ok
            this.log('aviso', 'Nenhuma tabela comum encontrada, mas a conexão parece estar ok');
            this.connectionStatus = 'CONNECTED';
            return true;
          }
          
          if (error3) {
            this.log('erro', `Erro ao testar conexão: ${error3.message}`);
            this.connectionStatus = 'DISCONNECTED';
            return false;
          }
        }
        
        if (error2) {
          this.log('erro', `Erro ao testar conexão: ${error2.message}`);
          this.connectionStatus = 'DISCONNECTED';
          return false;
        }
      }
      
      if (error) {
        this.log('erro', `Erro ao testar conexão: ${error.message}`);
        this.connectionStatus = 'DISCONNECTED';
        return false;
      }
      
      this.log('info', 'Conexão com Supabase estabelecida com sucesso');
      this.connectionStatus = 'CONNECTED';
      return true;
    } catch (error) {
      this.log('erro', `Erro ao testar conexão: ${(error as Error).message}`);
      this.connectionStatus = 'DISCONNECTED';
      return false;
    }
  }
  
  /**
   * Obter estatísticas da conexão
   * @returns Estatísticas da conexão
   */
  public async getConnectionStats(): Promise<{
    status: ConnectionStatus;
    responseTime?: number;
    lastChecked: Date;
    url: string;
    keyType: 'anon' | 'service_role' | 'unknown';
  }> {
    const startTime = Date.now();
    await this.testConnection();
    const responseTime = Date.now() - startTime;
    
    // Determinar o tipo de chave
    let keyType: 'anon' | 'service_role' | 'unknown' = 'unknown';
    if (this.supabaseKey) {
      try {
        const decoded = JSON.parse(globalThis.atob(this.supabaseKey.split('.')[1]));
        keyType = decoded.role === 'anon' ? 'anon' : 
                 decoded.role === 'service_role' ? 'service_role' : 'unknown';
      } catch {
        // Ignorar erro de decodificação
      }
    }
    
    return {
      status: this.connectionStatus,
      responseTime: this.connectionStatus === 'CONNECTED' ? responseTime : undefined,
      lastChecked: new Date(),
      url: this.supabaseUrl,
      keyType
    };
  }
  
  /**
   * Reconectar ao Supabase com tentativas
   * @param maxAttempts Número máximo de tentativas
   * @param delay Delay entre tentativas em ms
   * @returns True se reconectado com sucesso
   */
  public async reconnect(maxAttempts: number = 3, delay: number = 1000): Promise<boolean> {
    this.log('info', 'Iniciando reconexão', { maxAttempts, delay });
    let attempts = 0;

    while (attempts < maxAttempts && this.connectionStatus !== 'CONNECTED') {
      attempts++;
      this.log('debug', `Tentativa de reconexão ${attempts}/${maxAttempts}`);

      try {
        this.resetClient();
        const connected = await this.testConnection();
        if (connected) {
          this.log('info', 'Reconexão bem-sucedida', { attempts });
          return true;
        }
      } catch (error) {
        this.log('erro', `Erro na tentativa de reconexão ${attempts}`, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (this.connectionStatus !== 'CONNECTED') {
      this.log('erro', 'Falha na reconexão após todas as tentativas', { attempts });
      return false;
    }
    return true;
  }
  
  /**
   * Registrar evento no log
   * @param level Nível do log
   * @param message Mensagem
   * @param data Dados adicionais
   */
  private log(level: 'debug' | 'info' | 'aviso' | 'erro', message: string, data?: unknown): void {
    if (!this.logService) return;
    
    switch (level) {
      case 'debug':
        this.logService.debug?.(message, data);
        break;
      case 'info':
        this.logService.info?.(message, data);
        break;
      case 'aviso':
        this.logService.aviso?.(message, data);
        break;
      case 'erro':
        this.logService.erro?.(message, data instanceof Error ? data : new Error(String(data)));
        break;
    }
  }
  
  /**
   * Criar cliente Supabase
   * @returns Cliente Supabase
   */
  private createClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: this.options.autoRefreshToken,
        persistSession: this.options.persistSession
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: this.options.headers
      }
    });
  }
  
  /**
   * Verificar conexão
   */
  private async checkConnection(): Promise<void> {
    try {
      await this.testConnection();
    } catch (error) {
      this.log('erro', `Erro ao verificar conexão: ${(error as Error).message}`);
      this.connectionStatus = 'DISCONNECTED';
    }
  }
}