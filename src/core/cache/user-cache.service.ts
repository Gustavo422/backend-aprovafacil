import { getLogger } from '../../lib/logging/logging-service.js';

const logger = getLogger('user-cache');

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
}

interface UserData {
  id: string;
  email: string;
  nome: string;
  role: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export class UserCacheService {
  private static instance: UserCacheService;
  private cache: Map<string, CacheEntry<UserData>> = new Map();
  private readonly config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutos em millisegundos
  };

  public static getInstance(): UserCacheService {
    if (!UserCacheService.instance) {
      UserCacheService.instance = new UserCacheService();
    }
    return UserCacheService.instance;
  }

  public getCachedUser(userId: string): UserData | null {
    const cached = this.cache.get(userId);
    if (cached && this.isValid(cached.timestamp)) {
      logger.debug('Cache hit para usuário', { userId });
      this.recordHit();
      return cached.data;
    }
    this.recordMiss();
    return null;
  }

  public setCachedUser(userId: string, user: UserData): void {
    // Limpar cache se atingir tamanho máximo
    if (this.cache.size >= this.config.maxSize) {
      this.cleanup();
    }

    this.cache.set(userId, {
      data: user,
      timestamp: Date.now(),
      ttl: this.config.defaultTTL,
    });
  }

  public invalidateUser(userId: string): void {
    this.cache.delete(userId);
  }

  public clear(): void {
    this.cache.clear();
  }

  public clearCache(): void {
    this.clear();
  }

  public cleanup(): void {
    // Remove entradas expiradas
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  public getStats(): Record<string, unknown> {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      missRate,
      hits: this.hits,
      misses: this.misses,
      totalRequests,
    };
  }

  private hits = 0;
  private misses = 0;

  private recordHit(): void {
    this.hits++;
  }

  private recordMiss(): void {
    this.misses++;
  }

  /**
   * Verifica se o cache ainda é válido
   */
  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.defaultTTL;
  }
}

// Instância singleton
export const userCache = UserCacheService.getInstance(); 