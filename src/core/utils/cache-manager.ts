// Cache Manager - Centralized cache management
import { ICacheService, ILogService } from '../interfaces/index.js';
import { CacheFactory, CacheProvider } from './cache-factory.js';
import { 
  CacheInvalidationStrategy, 
  CacheDependency,
} from './cache-invalidation.strategy.js';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cache configuration options
 */
export interface CacheOptions {
  ttl?: number;
  dependencies?: CacheDependency[];
}

/**
 * Cache manager for centralized cache operations
 */
export class CacheManager {
  private cacheService: ICacheService;
  private logService: ILogService;
  private invalidationStrategy: CacheInvalidationStrategy;
  private static instance: CacheManager;
  
  private constructor(
    cacheProvider: CacheProvider,
    logService: ILogService,
    supabase?: SupabaseClient,
  ) {
    this.logService = logService;
    this.cacheService = CacheFactory.createCacheService(cacheProvider, logService, supabase);
    this.invalidationStrategy = new CacheInvalidationStrategy(this.cacheService, logService);
    
    // Load dependency map
    this.invalidationStrategy.loadDependencyMap().catch(async (error) => {
      await this.logService.erro('Erro ao inicializar estratégia de invalidação de cache', error as Error);
    });
    
    // Set up cache cleanup interval
    setInterval(() => { this.cleanupCache(); }, 30 * 60 * 1000); // Run every 30 minutes
  }
  
  /**
   * Get the singleton instance of CacheManager
   */
  public static getInstance(
    cacheProvider: CacheProvider = CacheProvider.MEMORY,
    logService: ILogService,
    supabase?: SupabaseClient,
  ): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(cacheProvider, logService, supabase);
    }
    return CacheManager.instance;
  }
  
  /**
   * Get a value from cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    return this.cacheService.obter<T>(key);
  }
  
  /**
   * Set a value in cache
   * @param key The cache key
   * @param value The value to cache
   * @param options Cache options including TTL and dependencies
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.cacheService.definir<T>(key, value, options?.ttl);
    
    // Register dependencies if provided
    if (options?.dependencies && options.dependencies.length > 0) {
      await this.invalidationStrategy.registerDependencies(key, options.dependencies);
    }
  }
  
  /**
   * Remove a value from cache
   * @param key The cache key
   */
  async remove(key: string): Promise<void> {
    await this.cacheService.remover(key);
  }
  
  /**
   * Check if a key exists in cache
   * @param key The cache key
   * @returns True if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    return this.cacheService.existe(key);
  }
  
  /**
   * Clear cache by pattern
   * @param pattern The pattern to match cache keys
   */
  async clear(pattern?: string): Promise<void> {
    await this.cacheService.limpar(pattern);
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<unknown> {
    return this.cacheService.obterEstatisticas();
  }
  
  /**
   * Invalidate cache by dependency
   * @param dependency The dependency to invalidate
   */
  async invalidate(dependency: CacheDependency): Promise<void> {
    await this.invalidationStrategy.invalidateByDependency(dependency);
  }
  
  /**
   * Invalidate all cache entries related to a user
   * @param usuarioId The user ID
   */
  async invalidateUserCache(usuarioId: string): Promise<void> {
    await this.invalidationStrategy.invalidateUserCache(usuarioId);
  }
  
  /**
   * Invalidate all cache entries related to a concurso
   * @param concursoId The concurso ID
   */
  async invalidateConcursoCache(concursoId: string): Promise<void> {
    await this.invalidationStrategy.invalidateConcursoCache(concursoId);
  }
  
  /**
   * Invalidate all cache entries related to a simulado
   * @param simuladoId The simulado ID
   */
  async invalidateSimuladoCache(simuladoId: string): Promise<void> {
    await this.invalidationStrategy.invalidateSimuladoCache(simuladoId);
  }
  
  /**
   * Invalidate all cache entries related to an apostila
   * @param apostilaId The apostila ID
   */
  async invalidateApostilaCache(apostilaId: string): Promise<void> {
    await this.invalidationStrategy.invalidateApostilaCache(apostilaId);
  }
  
  /**
   * Get or set cache value with automatic dependency tracking
   * @param key The cache key
   * @param factory Function to generate the value if not in cache
   * @param options Cache options
   * @returns The cached or generated value
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = await this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Generate the value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }
  
  /**
   * Clean up expired cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      // For Redis, this is handled automatically
      // For in-memory cache with DB persistence, we need to clean up
      const removedCount = await this.cacheService.limparCacheExpiradoBanco();
      
      if (removedCount > 0) {
        await this.logService.info(`Limpeza de cache: ${removedCount} entradas expiradas removidas`);
      }
    } catch (error) {
      await this.logService.erro('Erro na limpeza automática de cache', error as Error);
    }
  }
  
  /**
   * Get the underlying cache service
   * @returns The cache service implementation
   */
  getCacheService(): ICacheService {
    return this.cacheService;
  }
}

export default CacheManager;