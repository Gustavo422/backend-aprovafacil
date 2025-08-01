// Cache Invalidation Strategy
import { ICacheService, ILogService } from '../interfaces/index.js';

/**
 * Cache invalidation strategies
 */
export enum InvalidationStrategy {
  /**
   * Time-based invalidation - cache expires after a set time
   */
  TIME_BASED = 'time-based',
  
  /**
   * Write-through invalidation - cache is invalidated when data is updated
   */
  WRITE_THROUGH = 'write-through',
  
  /**
   * On-demand invalidation - cache is invalidated manually when needed
   */
  ON_DEMAND = 'on-demand'
}

/**
 * Cache dependency types for invalidation
 */
export enum CacheDependencyType {
  USER = 'user',
  CONCURSO = 'concurso',
  SIMULADO = 'simulado',
  QUESTAO = 'questao',
  APOSTILA = 'apostila',
  CATEGORIA = 'categoria',
  PLANO = 'plano',
  GLOBAL = 'global'
}

/**
 * Cache dependency for tracking related cache entries
 */
export interface CacheDependency {
  type: CacheDependencyType;
  id: string;
}

/**
 * Cache invalidation strategy implementation
 */
export class CacheInvalidationStrategy {
  private cacheService: ICacheService;
  private logService: ILogService;
  private dependencyMap: Map<string, Set<string>> = new Map();
  
  constructor(cacheService: ICacheService, logService: ILogService) {
    this.cacheService = cacheService;
    this.logService = logService;
  }
  
  /**
   * Register a cache key with its dependencies
   * @param key The cache key
   * @param dependencies The dependencies that this cache key relies on
   */
  async registerDependencies(key: string, dependencies: CacheDependency[]): Promise<void> {
    try {
      for (const dependency of dependencies) {
        const dependencyKey = `${dependency.type}:${dependency.id}`;
        
        if (!this.dependencyMap.has(dependencyKey)) {
          this.dependencyMap.set(dependencyKey, new Set());
        }
        
        this.dependencyMap.get(dependencyKey)?.add(key);
      }
      
      // Store dependency map in cache for persistence across restarts
      await this.cacheService.definir('cache_dependency_map', 
        Array.from(this.dependencyMap.entries()).map(([k, v]) => [k, Array.from(v)]), 
        1440, // 24 hours
      );
      
      await this.logService.debug(`Dependências de cache registradas para: ${key}`, { 
        dependencies: dependencies.map(d => `${d.type}:${d.id}`).join(', '), 
      });
    } catch (error) {
      await this.logService.erro('Erro ao registrar dependências de cache', error as Error, { key });
    }
  }
  
  /**
   * Invalidate cache based on a dependency
   * @param dependency The dependency that was updated
   */
  async invalidateByDependency(dependency: CacheDependency): Promise<void> {
    try {
      const dependencyKey = `${dependency.type}:${dependency.id}`;
      const keysToInvalidate = this.dependencyMap.get(dependencyKey);
      
      if (!keysToInvalidate || keysToInvalidate.size === 0) {
        return;
      }
      
      // Invalidate all related cache keys
      for (const key of keysToInvalidate) {
        await this.cacheService.remover(key);
      }
      
      await this.logService.info(`Cache invalidado por dependência: ${dependencyKey}`, {
        keys_invalidated: Array.from(keysToInvalidate),
      });
      
      // Remove the dependency from the map
      this.dependencyMap.delete(dependencyKey);
      
      // Update dependency map in cache
      await this.cacheService.definir('cache_dependency_map', 
        Array.from(this.dependencyMap.entries()).map(([k, v]) => [k, Array.from(v)]), 
        1440, // 24 hours
      );
    } catch (error) {
      await this.logService.erro('Erro ao invalidar cache por dependência', error as Error, { 
        dependency_type: dependency.type,
        dependency_id: dependency.id,
      });
    }
  }
  
  /**
   * Invalidate cache by pattern
   * @param pattern The pattern to match cache keys
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      await this.cacheService.limpar(pattern);
      await this.logService.info(`Cache invalidado por padrão: ${pattern}`);
    } catch (error) {
      await this.logService.erro('Erro ao invalidar cache por padrão', error as Error, { pattern });
    }
  }
  
  /**
   * Invalidate all cache entries related to a user
   * @param usuarioId The user ID
   */
  async invalidateUserCache(usuarioId: string): Promise<void> {
    await this.invalidateByDependency({
      type: CacheDependencyType.USER,
      id: usuarioId,
    });
    
    // Also invalidate by pattern for keys that might not be registered
    await this.invalidateByPattern(`user_${usuarioId}`);
  }
  
  /**
   * Invalidate all cache entries related to a concurso
   * @param concursoId The concurso ID
   */
  async invalidateConcursoCache(concursoId: string): Promise<void> {
    await this.invalidateByDependency({
      type: CacheDependencyType.CONCURSO,
      id: concursoId,
    });
    
    // Also invalidate by pattern
    await this.invalidateByPattern(`concurso_${concursoId}`);
  }
  
  /**
   * Invalidate all cache entries related to a simulado
   * @param simuladoId The simulado ID
   */
  async invalidateSimuladoCache(simuladoId: string): Promise<void> {
    await this.invalidateByDependency({
      type: CacheDependencyType.SIMULADO,
      id: simuladoId,
    });
    
    // Also invalidate by pattern
    await this.invalidateByPattern(`simulado_${simuladoId}`);
  }
  
  /**
   * Invalidate all cache entries related to an apostila
   * @param apostilaId The apostila ID
   */
  async invalidateApostilaCache(apostilaId: string): Promise<void> {
    await this.invalidateByDependency({
      type: CacheDependencyType.APOSTILA,
      id: apostilaId,
    });
    
    // Also invalidate by pattern
    await this.invalidateByPattern(`apostila_${apostilaId}`);
    await this.invalidateByPattern(`conteudo_apostila_${apostilaId}`);
  }
  
  /**
   * Load dependency map from cache
   */
  async loadDependencyMap(): Promise<void> {
    try {
      const storedMap = await this.cacheService.obter<Array<[string, string[]]>>('cache_dependency_map');
      
      if (storedMap) {
        this.dependencyMap = new Map(
          storedMap.map(([key, values]) => [key, new Set(values)]),
        );
        
        await this.logService.info(`Mapa de dependências de cache carregado: ${this.dependencyMap.size} entradas`);
      } else {
        // Se não há mapa armazenado, inicializar com mapa vazio
        this.dependencyMap = new Map();
        await this.logService.info('Mapa de dependências de cache inicializado vazio');
      }
    } catch (error) {
      // Se há erro ao carregar, inicializar com mapa vazio
      this.dependencyMap = new Map();
      await this.logService.info('Mapa de dependências de cache inicializado vazio devido a erro');
    }
  }
}

export default CacheInvalidationStrategy;