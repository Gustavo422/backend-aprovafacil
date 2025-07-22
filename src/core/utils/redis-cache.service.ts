// Redis Cache Service Implementation
import { createClient, RedisClientType } from 'redis';
import { ICacheService, ILogService } from '../interfaces/index.js';

export class RedisCacheService implements ICacheService {
  private client: RedisClientType;
  private logService: ILogService;
  private isConnected: boolean = false;
  private readonly defaultTTL: number = 60; // 60 minutes default TTL
  private readonly keyPrefix: string = 'aprovafacil:';
  private readonly connectionOptions: {
    url: string;
    password?: string;
    username?: string;
  };

  constructor(logService: ILogService) {
    this.logService = logService;
    
    // Get Redis connection details from environment variables
    this.connectionOptions = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
    };
    
    this.client = createClient(this.connectionOptions);
    
    // Set up event handlers
    this.client.on('error', (err) => this.handleConnectionError(err));
    this.client.on('connect', () => this.handleConnectionSuccess());
    this.client.on('reconnecting', () => this.handleReconnecting());
    
    // Connect to Redis
    this.connect();
  }
  
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      await this.logService.erro('Falha ao conectar com Redis', error as Error);
      this.isConnected = false;
    }
  }
  
  private async handleConnectionError(error: Error): Promise<void> {
    this.isConnected = false;
    await this.logService.erro('Erro na conexão com Redis', error);
  }
  
  private async handleConnectionSuccess(): Promise<void> {
    this.isConnected = true;
    await this.logService.info('Conexão com Redis estabelecida com sucesso');
  }
  
  private async handleReconnecting(): Promise<void> {
    await this.logService.aviso('Tentando reconectar ao Redis...');
  }
  
  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async obter<T>(chave: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        await this.logService.aviso('Tentativa de obter cache sem conexão Redis');
        return null;
      }
      
      const fullKey = this.getFullKey(chave);
      const data = await this.client.get(fullKey);
      
      if (!data) {
        await this.logService.logarOperacaoCache('GET', chave, false);
        return null;
      }
      
      await this.logService.logarOperacaoCache('GET', chave, true);
      return typeof data === 'string' ? JSON.parse(data) as T : data as T;
    } catch (error) {
      await this.logService.erro('Erro ao obter cache do Redis', error as Error, { chave });
      return null;
    }
  }

  async definir<T>(chave: string, valor: T, ttlMinutos?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.logService.aviso('Tentativa de definir cache sem conexão Redis');
        return;
      }
      
      const fullKey = this.getFullKey(chave);
      const ttl = ttlMinutos || this.defaultTTL;
      const ttlSeconds = ttl * 60;
      
      await this.client.setEx(
        fullKey,
        ttlSeconds,
        JSON.stringify(valor)
      );
      
      await this.logService.logarOperacaoCache('SET', chave, true);
    } catch (error) {
      await this.logService.erro('Erro ao definir cache no Redis', error as Error, { chave, ttl: ttlMinutos });
      throw error;
    }
  }

  async remover(chave: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.logService.aviso('Tentativa de remover cache sem conexão Redis');
        return;
      }
      
      const fullKey = this.getFullKey(chave);
      await this.client.del(fullKey);
      
      await this.logService.logarOperacaoCache('DELETE', chave, true);
    } catch (error) {
      await this.logService.erro('Erro ao remover cache do Redis', error as Error, { chave });
      throw error;
    }
  }

  async limpar(padrao?: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.logService.aviso('Tentativa de limpar cache sem conexão Redis');
        return;
      }
      
      if (padrao) {
        // Use Redis SCAN to find keys matching the pattern
        const pattern = this.getFullKey(`*${padrao}*`);
        let cursor = 0;
        let keys: string[] = [];
        
        do {
          const reply = await this.client.scan(cursor.toString(), {
            MATCH: pattern,
            COUNT: 100
          });
          
          cursor = parseInt(reply.cursor);
          keys = keys.concat(reply.keys);
        } while (cursor !== 0);
        
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        
        await this.logService.info(`Cache Redis limpo com padrão: ${padrao}`, { 
          chaves_removidas: keys.length 
        });
      } else {
        // Clear all keys with our prefix
        const pattern = this.getFullKey('*');
        let cursor = 0;
        let keys: string[] = [];
        
        do {
          const reply = await this.client.scan(cursor.toString(), {
            MATCH: pattern,
            COUNT: 100
          });
          
          cursor = parseInt(reply.cursor);
          keys = keys.concat(reply.keys);
        } while (cursor !== 0);
        
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        
        await this.logService.info(`Todo o cache Redis foi limpo: ${keys.length} chaves removidas`);
      }
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache do Redis', error as Error, { padrao });
      throw error;
    }
  }

  async existe(chave: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.logService.aviso('Tentativa de verificar existência no cache sem conexão Redis');
        return false;
      }
      
      const fullKey = this.getFullKey(chave);
      const exists = await this.client.exists(fullKey);
      
      return exists === 1;
    } catch (error) {
      await this.logService.erro('Erro ao verificar existência no cache Redis', error as Error, { chave });
      return false;
    }
  }

  async obterEstatisticas(): Promise<{
    status: string;
    total_chaves: number;
    memoria_usada_mb: number;
    conexoes_ativas: number;
    tempo_atividade_segundos: number;
    versao: string;
  }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'desconectado',
          total_chaves: 0,
          memoria_usada_mb: 0,
          conexoes_ativas: 0,
          tempo_atividade_segundos: 0,
          versao: 'desconhecida'
        };
      }
      
      // Get Redis info
      const info = await this.client.info();
      
      // Parse Redis INFO command output
      const parseInfo = (info: string) => {
        const result: Record<string, string> = {};
        const lines = info.split('\r\n');
        
        for (const line of lines) {
          if (line && !line.startsWith('#')) {
            const parts = line.split(':');
            if (parts.length === 2) {
              result[parts[0]] = parts[1];
            }
          }
        }
        
        return result;
      };
      
      const parsedInfo = parseInfo(info);
      
      // Count keys with our prefix
      const pattern = this.getFullKey('*');
      let cursor = 0;
      let keys: string[] = [];
      
      do {
        const reply = await this.client.scan(cursor.toString(), {
          MATCH: pattern,
          COUNT: 100
        });
        
        cursor = parseInt(reply.cursor);
        keys = keys.concat(reply.keys);
      } while (cursor !== 0);
      
      return {
        status: this.isConnected ? 'conectado' : 'desconectado',
        total_chaves: keys.length,
        memoria_usada_mb: parseInt(parsedInfo['used_memory'] || '0') / (1024 * 1024),
        conexoes_ativas: parseInt(parsedInfo['connected_clients'] || '0'),
        tempo_atividade_segundos: parseInt(parsedInfo['uptime_in_seconds'] || '0'),
        versao: parsedInfo['redis_version'] || 'desconhecida'
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas do Redis', error as Error);
      return {
        status: 'erro',
        total_chaves: 0,
        memoria_usada_mb: 0,
        conexoes_ativas: 0,
        tempo_atividade_segundos: 0,
        versao: 'desconhecida'
      };
    }
  }

  async limparCacheExpiradoBanco(): Promise<number> {
    // Redis automatically removes expired keys, so this method is not needed
    // but we implement it to satisfy the interface
    return 0;
  }
  
  // Helper methods for specific cache types
  async obterProgressoUsuario(usuarioId: string): Promise<unknown> {
    return this.obter(`progresso_usuario_${usuarioId}`);
  }

  async definirProgressoUsuario(usuarioId: string, progresso: unknown): Promise<void> {
    await this.definir(`progresso_usuario_${usuarioId}`, progresso);
  }

  async obterResultadoSimulado(usuarioId: string, simuladoId: string): Promise<unknown> {
    return this.obter(`resultado_simulado_${usuarioId}_${simuladoId}`);
  }

  async definirResultadoSimulado(usuarioId: string, simuladoId: string, resultado: unknown): Promise<void> {
    await this.definir(`resultado_simulado_${usuarioId}_${simuladoId}`, resultado);
  }

  async obterQuestoesSemana(ano: number, semana: number): Promise<unknown> {
    return this.obter(`questoes_semana_${ano}_${semana}`);
  }

  async definirQuestoesSemana(ano: number, semana: number, questoes: unknown): Promise<void> {
    await this.definir(`questoes_semana_${ano}_${semana}`, questoes);
  }

  async obterConteudoApostila(apostilaId: string): Promise<unknown> {
    return this.obter(`conteudo_apostila_${apostilaId}`);
  }

  async definirConteudoApostila(apostilaId: string, conteudo: unknown): Promise<void> {
    await this.definir(`conteudo_apostila_${apostilaId}`, conteudo);
  }

  async obterPlanoEstudo(usuarioId: string): Promise<unknown> {
    return this.obter(`plano_estudo_${usuarioId}`);
  }

  async definirPlanoEstudo(usuarioId: string, plano: unknown): Promise<void> {
    await this.definir(`plano_estudo_${usuarioId}`, plano);
  }
}

export default RedisCacheService;