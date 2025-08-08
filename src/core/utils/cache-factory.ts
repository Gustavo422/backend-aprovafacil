// Cache Factory - Implements Factory Pattern for cache providers
import type { ICacheService, ILogService } from '../interfaces/index.js';
import { CacheService } from './cache.service.js';
import { RedisCacheService } from './redis-cache.service.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export enum CacheProvider {
  MEMORY = 'memory',
  REDIS = 'redis',
  HYBRID = 'hybrid' // Uses both memory and Redis
}

export class CacheFactory {
  /**
   * Creates a cache service instance based on the specified provider
   * @param provider The cache provider to use
   * @param logService The log service instance
   * @param supabase Optional Supabase client (required for memory cache)
   * @returns An ICacheService implementation
   */
  static createCacheService(
    provider: CacheProvider,
    logService: ILogService,
    supabase?: SupabaseClient,
  ): ICacheService {
    // Get provider from environment variable if not specified
    const cacheProvider = provider ?? 
      (process.env.CACHE_PROVIDER as CacheProvider) ?? 
      CacheProvider.MEMORY;
    
    switch (cacheProvider) {
    case CacheProvider.REDIS:
      return new RedisCacheService(logService);
      
    case CacheProvider.MEMORY:
      if (!supabase) {
        throw new Error('Supabase client is required for memory cache');
      }
      return new CacheService(supabase, logService);
      
    case CacheProvider.HYBRID:
      // Implement hybrid cache if needed in the future
      throw new Error('Hybrid cache provider not implemented yet');
      
    default:
      if (!supabase) {
        throw new Error('Supabase client is required for memory cache');
      }
      return new CacheService(supabase, logService);
    }
  }
}

export default CacheFactory;