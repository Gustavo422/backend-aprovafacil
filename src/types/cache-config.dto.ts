// DTO de Cache Config - Atualizado para corresponder ao schema real
export interface CacheConfigDTO {
  id: string;
  cache_key: string;
  ttl_minutes: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCacheConfigDTO {
  cache_key: string;
  ttl_minutes?: number;
  description?: string;
}

export interface UpdateCacheConfigDTO {
  cache_key?: string;
  ttl_minutes?: number;
  description?: string;
}