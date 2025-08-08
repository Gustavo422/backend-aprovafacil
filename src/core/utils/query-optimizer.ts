import type { SupabaseClient } from '@supabase/supabase-js';
import type { ILogService } from '../interfaces/index.js';

/**
 * Interface para configuração de paginação
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Interface para filtros de consulta
 */
export interface QueryFilters {
  [key: string]: string | number | boolean | string[] | { operator: string; value: unknown; min?: number; max?: number } | undefined;
}

/**
 * Interface para resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Otimizador de consultas para Supabase
 */
export class QueryOptimizer {
  private readonly supabase: SupabaseClient;
  private readonly logService: ILogService;

  constructor(supabase: SupabaseClient, logService: ILogService) {
    this.supabase = supabase;
    this.logService = logService;
  }

  async executePaginatedQuery<T>(
    table: string,
    config: PaginationConfig,
    filters?: QueryFilters,
    select?: string,
  ): Promise<PaginatedResult<T>> {
    try {
      let query = this.supabase
        .from(table)
        .select(select ?? '*', { count: 'exact' });

      // Aplicar filtros
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Aplicar ordenação
      if (config.orderBy) {
        query = query.order(config.orderBy, { ascending: config.orderDirection !== 'desc' });
      }

      // Aplicar paginação
      const offset = (config.page - 1) * config.limit;
      query = query.range(offset, offset + config.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const total = count ?? 0;
      const totalPages = Math.ceil(total / config.limit);

      return {
        data: (data as T[]) ?? [],
        pagination: {
          page: config.page,
          limit: config.limit,
          total,
          totalPages,
          hasNext: config.page < totalPages,
          hasPrev: config.page > 1,
        },
      };
    } catch (error) {
      await this.logService.erro(`Erro ao executar consulta paginada na tabela ${table}`, error as Error);
      throw error;
    }
  }

  async executeCachedQuery<T>(
    table: string,
    cacheKey: string,
    filters?: QueryFilters,
    select?: string,
    _ttl = 300,
  ): Promise<T[]> {
    // TODO: Implementar cache
    return this.executeSimpleQuery<T>(table, filters, select);
  }

  async executeJoinedQuery<T>(
    table: string,
    joins: string[],
    filters?: QueryFilters,
    select?: string,
  ): Promise<T[]> {
    try {
      // Construir select completo incluindo joins
      let selectClause = select ?? '*';
      if (joins.length > 0) {
        selectClause = `${selectClause},${joins.join(',')}`;
      }

      let query = this.supabase
        .from(table)
        .select(selectClause);

      // Aplicar filtros
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const result = (data as T[]) ?? [];
      return result;
    } catch (error) {
      await this.logService.erro(`Erro ao executar consulta com joins na tabela ${table}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async executeAggregateQuery<T>(
    table: string,
    aggregates: string[],
    filters?: QueryFilters,
    groupBy?: string[],
  ): Promise<T[]> {
    try {
      let query = this.supabase
        .from(table)
        .select(aggregates.join(', '));

      // Aplicar filtros
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Aplicar group by
      if (groupBy && groupBy.length > 0) {
        // @ts-expect-error - Supabase types are complex
        query = query.group(groupBy.join(', '));
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const result = (data as T[]) ?? [];
      return result;
    } catch (error) {
      await this.logService.erro(`Erro ao executar consulta agregada na tabela ${table}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private applyFilters(query: any, filters: QueryFilters): any {
    let currentQuery = query;
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;

      if (typeof value === 'string' && value.includes('*')) {
        // Busca com wildcard
        const searchValue = value.replace(/\*/g, '%');
        currentQuery = currentQuery.ilike(key, searchValue);
      } else if (Array.isArray(value)) {
        // Busca em array
        currentQuery = currentQuery.in(key, value);
      } else if (typeof value === 'object' && value !== null && 'operator' in value) {
        // Operadores especiais
        const operatorValue = value as { operator: string; value: unknown; min?: number; max?: number };
        
        switch (operatorValue.operator) {
          case 'gt':
            currentQuery = currentQuery.gt(key, operatorValue.value);
            break;
          case 'gte':
            currentQuery = currentQuery.gte(key, operatorValue.value);
            break;
          case 'lt':
            currentQuery = currentQuery.lt(key, operatorValue.value);
            break;
          case 'lte':
            currentQuery = currentQuery.lte(key, operatorValue.value);
            break;
          case 'neq':
            currentQuery = currentQuery.neq(key, operatorValue.value);
            break;
          case 'range':
            if (operatorValue.min !== undefined && operatorValue.max !== undefined) {
              currentQuery = currentQuery.range(key, operatorValue.min, operatorValue.max);
            }
            break;
          default:
            currentQuery = currentQuery.eq(key, operatorValue.value);
        }
      } else {
        // Busca exata
        currentQuery = currentQuery.eq(key, value);
      }
    }
    
    return currentQuery;
  }

  async optimizeQueryForDataType<T>(
    dataType: 'apostilas' | 'simulados' | 'flashcards' | 'questoes',
    concursoId: string,
    filters?: QueryFilters,
  ): Promise<T[]> {
    // Implementação específica para cada tipo de dado
    const tableMap = {
      apostilas: 'apostilas',
      simulados: 'simulados',
      flashcards: 'flashcards',
      questoes: 'questoes',
    };

    const table = tableMap[dataType];
    return this.executeSimpleQuery<T>(table, { ...filters, concurso_id: concursoId });
  }

  async executeBatchQueries<T>(
    queries: Array<{
      table: string;
      filters?: QueryFilters;
      select?: string;
    }>,
  ): Promise<T[][]> {
    const results: T[][] = [];
    
    for (const queryConfig of queries) {
      const result = await this.executeSimpleQuery<T>(
        queryConfig.table,
        queryConfig.filters,
        queryConfig.select,
      );
      results.push(result);
    }
    
    return results;
  }

  private async executeSimpleQuery<T>(
    table: string,
    filters?: QueryFilters,
    select?: string,
  ): Promise<T[]> {
    try {
      let query = this.supabase
        .from(table)
        .select(select ?? '*');

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const result = (data as T[]) ?? [];
      return result;
    } catch (error) {
      await this.logService.erro(`Erro ao executar consulta simples na tabela ${table}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
} 