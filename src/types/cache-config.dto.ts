// DTO de Cache Config - Atualizado para corresponder ao schema real
export interface CacheConfigDTO {
  id: string;
  cache_key: string;
  ttl_minutes: number;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CreateCacheConfigDTO {
  cache_key: string;
  ttl_minutes?: number;
  descricao?: string;
}

export interface UpdateCacheConfigDTO {
  cache_key?: string;
  ttl_minutes?: number;
  descricao?: string;
}
