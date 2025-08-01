// Cached Repository Decorator
// This decorator adds caching to repository methods
import { IBaseRepository, ICacheService } from '../interfaces/index.js';
import { FiltroBase, PaginatedResponse } from '../../shared/types/index.js';
import { CacheDependencyType } from './cache-invalidation.strategy.js';

/**
 * Options for cached repository methods
 */
export interface CachedRepositoryOptions {
  ttl?: number;
  keyPrefix?: string;
  dependencyType?: CacheDependencyType;
}

/**
 * Decorator class that adds caching to repository methods
 */
export class CachedRepository<T, TFilter extends FiltroBase = FiltroBase> implements IBaseRepository<T, TFilter> {
  private repository: IBaseRepository<T, TFilter>;
  private cacheService: ICacheService;
  private options: CachedRepositoryOptions;
  private entityName: string;
  
  constructor(
    repository: IBaseRepository<T, TFilter>,
    cacheService: ICacheService,
    entityName: string,
    options: CachedRepositoryOptions = {},
  ) {
    this.repository = repository;
    this.cacheService = cacheService;
    this.entityName = entityName;
    this.options = {
      ttl: options.ttl || 30, // 30 minutes default
      keyPrefix: options.keyPrefix || `${entityName.toLowerCase()}_`,
      dependencyType: options.dependencyType || CacheDependencyType.GLOBAL,
    };
  }
  
  /**
   * Get cache key for an entity by ID
   */
  private getEntityCacheKey(id: string): string {
    return `${this.options.keyPrefix}${id}`;
  }
  
  /**
   * Get cache key for a collection with filters
   */
  private getCollectionCacheKey(filtro?: TFilter): string {
    const filterStr = filtro ? JSON.stringify(filtro) : 'all';
    return `${this.options.keyPrefix}collection_${filterStr}`;
  }
  
  /**
   * Find entity by ID with caching
   */
  async buscarPorId(id: string): Promise<T | null> {
    const cacheKey = this.getEntityCacheKey(id);
    
    // Try to get from cache first
    const cached = await this.cacheService.obter<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from repository
    const entity = await this.repository.buscarPorId(id);
    
    // Cache the result if found
    if (entity) {
      await this.cacheService.definir(cacheKey, entity, this.options.ttl);
    }
    
    return entity;
  }
  
  /**
   * Find all entities with caching
   */
  async buscarTodos(filtro?: TFilter): Promise<PaginatedResponse<T>> {
    const cacheKey = this.getCollectionCacheKey(filtro);
    
    // Try to get from cache first
    const cached = await this.cacheService.obter<PaginatedResponse<T>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from repository
    const entities = await this.repository.buscarTodos(filtro);
    
    // Cache the result
    await this.cacheService.definir(cacheKey, entities, this.options.ttl);
    
    return entities;
  }
  
  /**
   * Create entity and invalidate cache
   */
  async criar(dados: Partial<T>): Promise<T> {
    // Create entity
    const entity = await this.repository.criar(dados);
    
    // Invalidate collection cache
    await this.cacheService.limpar(this.options.keyPrefix + 'collection_');
    
    return entity;
  }
  
  /**
   * Update entity and invalidate cache
   */
  async atualizar(id: string, dados: Partial<T>): Promise<T> {
    // Update entity
    const entity = await this.repository.atualizar(id, dados);
    
    // Invalidate entity cache
    await this.cacheService.remover(this.getEntityCacheKey(id));
    
    // Invalidate collection cache
    await this.cacheService.limpar(this.options.keyPrefix + 'collection_');
    
    return entity;
  }
  
  /**
   * Delete entity and invalidate cache
   */
  async excluir(id: string): Promise<boolean> {
    // Delete entity
    const result = await this.repository.excluir(id);
    
    // Invalidate entity cache
    await this.cacheService.remover(this.getEntityCacheKey(id));
    
    // Invalidate collection cache
    await this.cacheService.limpar(this.options.keyPrefix + 'collection_');
    
    return result;
  }
  
  /**
   * Check if entity exists by ID with caching
   */
  async existePorId(id: string): Promise<boolean> {
    const cacheKey = `${this.options.keyPrefix}exists_${id}`;
    
    // Try to get from cache first
    const cached = await this.cacheService.obter<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Check repository
    const exists = await this.repository.existePorId(id);
    
    // Cache the result
    await this.cacheService.definir(cacheKey, exists, this.options.ttl);
    
    return exists;
  }
}

/**
 * Factory function to create a cached repository
 */
export function createCachedRepository<T, TFilter extends FiltroBase = FiltroBase>(
  repository: IBaseRepository<T, TFilter>,
  cacheService: ICacheService,
  entityName: string,
  options: CachedRepositoryOptions = {},
): IBaseRepository<T, TFilter> {
  return new CachedRepository<T, TFilter>(repository, cacheService, entityName, options);
}

export default createCachedRepository;