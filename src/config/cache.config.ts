// Cache configuration
import dotenv from 'dotenv';
import { CacheProvider } from '../core/utils/cache-factory.js';

// Load environment variables
dotenv.config();

/**
 * Cache configuration options
 */
export interface CacheConfig {
  provider: CacheProvider;
  defaultTTL: number;
  maxKeys: number;
  redis: {
    url: string;
    password?: string;
    username?: string;
    keyPrefix: string;
  };
  invalidation: {
    cleanupInterval: number; // in milliseconds
  };
}

/**
 * Cache configuration
 */
const cacheConfig: CacheConfig = {
  provider: (process.env.CACHE_PROVIDER as CacheProvider) || CacheProvider.MEMORY,
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '30', 10),
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'aprovafacil:'
  },
  invalidation: {
    cleanupInterval: 30 * 60 * 1000 // 30 minutes
  }
};

export default cacheConfig;