// Redis Cache Service Implementation
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import type { ICacheService, ILogService } from '../interfaces/index.js';

export class RedisCacheService implements ICacheService {
  private readonly client!: RedisClientType;
  private readonly logService: ILogService;
  private isConnected = false;
  private readonly defaultTTL: number = 60; // 60 minutes default TTL
  private readonly keyPrefix: string = 'aprovafacil:';
  private readonly connectionOptions!: {
    url: string;
    password?: string;
    username?: string;
  };
  private readonly redisDisabled: boolean;

  constructor(logService: ILogService) {
    this.logService = logService;
    this.redisDisabled = process.env.REDIS_DISABLED === 'true';
    
    if (this.redisDisabled) {
      this.logService.info('Redis desabilitado via variável de ambiente REDIS_DISABLED');
      return;
    }
    
    // Get Redis connection details from environment variables
    this.connectionOptions = {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
    };
    
    this.client = createClient(this.connectionOptions);
    
    // Set up event handlers
    this.client.on('error', (err) => { 
      this.handleConnectionError(err instanceof Error ? err : new Error(String(err))); 
    });
    this.client.on('connect', () => { 
      this.handleConnectionSuccess(); 
    });
    this.client.on('reconnecting', () => { 
      this.handleReconnecting(); 
    });
    
    // Connect to Redis
    this.connect();
  }
  
  private async connect(): Promise<void> {
    if (this.redisDisabled) return;
    
    try {
      await this.client.connect();
    } catch (error) {
      this.logService.erro('Falha ao conectar com Redis', error instanceof Error ? error : new Error(String(error)));
      this.isConnected = false;
    }
  }
  
  private async handleConnectionError(error: Error): Promise<void> {
    this.isConnected = false;
    this.logService.erro('Erro na conexão com Redis', error);
    return Promise.resolve();
  }
  
  private async handleConnectionSuccess(): Promise<void> {
    this.isConnected = true;
    this.logService.info('Conexão com Redis estabelecida com sucesso');
    return Promise.resolve();
  }
  
  private async handleReconnecting(): Promise<void> {
    this.logService.aviso('Tentando reconectar ao Redis...');
    return Promise.resolve();
  }
  
  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async obter<T>(chave: string): Promise<T | null> {
    if (this.redisDisabled) {
      return null;
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de obter cache sem conexão Redis');
        return null;
      }
      
      const fullKey = this.getFullKey(chave);
      const data = await this.client.get(fullKey);
      
      if (!data) {
        this.logService.logarOperacaoCache('GET', chave, false);
        return null;
      }
      
      this.logService.logarOperacaoCache('GET', chave, true);
      const parsedData = typeof data === 'string' ? JSON.parse(data) as T : data as T;
      return parsedData;
    } catch (error) {
      this.logService.erro('Erro ao obter cache do Redis', error as Error, { chave });
      return null;
    }
  }

  async definir<T>(chave: string, valor: T, ttlSegundos?: number): Promise<void> {
    if (this.redisDisabled) {
      return;
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de definir cache sem conexão Redis');
        return;
      }
      
      const fullKey = this.getFullKey(chave);
      const ttl = ttlSegundos ?? this.defaultTTL;
      const serializedValue = typeof valor === 'string' ? valor : JSON.stringify(valor);
      
      await this.client.setEx(fullKey, ttl * 60, serializedValue);
      this.logService.logarOperacaoCache('SET', chave, true);
    } catch (error) {
      this.logService.erro('Erro ao definir cache no Redis', error as Error, { chave, ttl: ttlSegundos });
      throw error;
    }
  }

  async remover(chave: string): Promise<void> {
    if (this.redisDisabled) {
      return;
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de remover cache sem conexão Redis');
        return;
      }
      
      const fullKey = this.getFullKey(chave);
      await this.client.del(fullKey);
      
      this.logService.logarOperacaoCache('DELETE', chave, true);
    } catch (error) {
      this.logService.erro('Erro ao remover cache do Redis', error as Error, { chave });
      throw error;
    }
  }

  async limparPorPrefixo(prefixo: string): Promise<void> {
    if (this.redisDisabled) {
      return;
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de limpar cache sem conexão Redis');
        return;
      }
      
      const pattern = this.getFullKey(`${prefixo}*`);
      let cursor = '0';
      
      do {
        const reply = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        
        cursor = reply.cursor;
        if (reply.keys.length > 0) {
          await this.client.del(reply.keys);
        }
      } while (cursor !== '0');
      
      this.logService.info(`Cache Redis limpo com prefixo: ${prefixo}`);

    } catch (error) {
      this.logService.erro('Erro ao limpar cache do Redis por prefixo', error as Error, { prefixo });
      throw error;
    }
  }

  async limpar(padrao?: string): Promise<void> {
    if (this.redisDisabled) {
      return Promise.resolve();
    }
    
    const prefixo = padrao || '*';
    return this.limparPorPrefixo(prefixo);
  }

  async existe(chave: string): Promise<boolean> {
    if (this.redisDisabled) {
      return false;
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de verificar existência no cache sem conexão Redis');
        return false;
      }
      
      const fullKey = this.getFullKey(chave);
      const exists = await this.client.exists(fullKey);
      
      return exists === 1;
    } catch (error) {
      this.logService.erro('Erro ao verificar existência no cache Redis', error as Error, { chave });
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
    if (this.redisDisabled) {
      return {
        status: 'desconectado',
        total_chaves: 0,
        memoria_usada_mb: 0,
        conexoes_ativas: 0,
        tempo_atividade_segundos: 0,
        versao: 'desconhecida',
      };
    }
    
    try {
      if (!this.isConnected) {
        return {
          status: 'desconectado',
          total_chaves: 0,
          memoria_usada_mb: 0,
          conexoes_ativas: 0,
          tempo_atividade_segundos: 0,
          versao: 'desconhecida',
        };
      }
      
      // Get Redis info
      const redisInfo = await this.client.info();
      
      // Parse Redis INFO command output
        const parseInfo = (info: string) => {
        const result: Record<string, string> = {};
        const lines = info.split('\r\n');
        
        for (const line of lines) {
          if (line && !line.startsWith('#')) {
            const parts = line.split(':');
            if (parts.length === 2) {
              result[parts[0] as string] = parts[1] as string;
            }
          }
        }
        
        return result;
      };
      
      const parsedInfo = parseInfo(redisInfo);
      
      // Count keys with our prefix
      const pattern = this.getFullKey('*');
      let cursor = 0;
      let keys: string[] = [];
      
      do {
        const reply = await this.client.scan(cursor.toString(), {
          MATCH: pattern,
          COUNT: 100,
        });
        
        cursor = parseInt(reply.cursor, 10);
        keys = keys.concat(reply.keys);
      } while (cursor !== 0);
      
      const result = {
        status: this.isConnected ? 'conectado' : 'desconectado',
        total_chaves: keys.length,
        memoria_usada_mb: parseInt(parsedInfo['used_memory'] ?? '0') / (1024 * 1024),
        conexoes_ativas: parseInt(parsedInfo['connected_clients'] ?? '0'),
        tempo_atividade_segundos: parseInt(parsedInfo['uptime_in_seconds'] ?? '0'),
        versao: parsedInfo['redis_version'] ?? 'desconhecida',
      };
      
      return result;
    } catch (error) {
      this.logService.erro('Erro ao obter estatísticas do Redis', error as Error);
      return {
        status: 'erro',
        total_chaves: 0,
        memoria_usada_mb: 0,
        conexoes_ativas: 0,
        tempo_atividade_segundos: 0,
        versao: 'desconhecida',
      };
    }
  }

  async limparCacheExpiradoBanco(): Promise<number> {
    if (this.redisDisabled) {
      return Promise.resolve(0);
    }
    
    try {
      if (!this.isConnected) {
        this.logService.aviso('Tentativa de limpar cache sem conexão Redis');
        return Promise.resolve(0);
      }
      
      // Redis automatically handles expiration, so we just return 0
      // as expired keys are automatically removed
      return Promise.resolve(0);
    } catch (error) {
      this.logService.erro('Erro ao limpar cache expirado no Redis', error as Error);
      return Promise.resolve(0);
    }
  }
}

export default RedisCacheService;