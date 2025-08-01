import { SupabaseClient } from '@supabase/supabase-js';
import { IBaseRepository } from '../interfaces/index.js';
import { FiltroBase, PaginatedResponse } from '../../shared/types/index.js';
import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { RetryOptions, RetryableError, executeWithRetry } from '../utils/retry.js';
import { DatabaseError, NotFoundError, ValidationError } from '../errors/index.js';
import { supabase } from '../../config/supabase-unified.js'; // Importação unificada
import { performance } from 'perf_hooks';

/**
 * Opções para o repositório base
 */
export interface BaseRepositoryOptions {
  /**
   * Nome da tabela
   */
  tableName: string;
  
  /**
   * Nome da coluna de ID
   */
  idColumn?: string;
  
  /**
   * Logger
   */
  logger?: EnhancedLogger;
  
  /**
   * Cliente Supabase
   */
  supabaseClient?: SupabaseClient;
  
  /**
   * Opções de retry
   */
  retryOptions?: RetryOptions;
  
  /**
   * Tempo de cache em segundos
   */
  cacheTime?: number;
  
  /**
   * Habilitar soft delete
   */
  softDelete?: boolean;
  
  /**
   * Nome da coluna de soft delete
   */
  deletedColumn?: string;
}

/**
 * Classe base para repositórios
 */
export abstract class BaseRepository<T, TFilter extends FiltroBase = FiltroBase> implements IBaseRepository<T, TFilter> {
  /**
   * Nome da tabela
   */
  protected readonly tableName: string;
  
  /**
   * Nome da coluna de ID
   */
  protected readonly idColumn: string;
  
  /**
   * Cliente Supabase
   */
  protected readonly supabase: SupabaseClient;
  
  /**
   * Logger
   */
  protected readonly logger: EnhancedLogger;
  
  /**
   * Opções de retry
   */
  protected readonly retryOptions: RetryOptions;
  
  /**
   * Tempo de cache em segundos
   */
  protected readonly cacheTime?: number;
  
  /**
   * Habilitar soft delete
   */
  protected readonly softDelete: boolean;
  
  /**
   * Nome da coluna de soft delete
   */
  protected readonly deletedColumn: string;
  
  /**
   * Construtor
   * @param options Opções do repositório
   */
  constructor(options: BaseRepositoryOptions) {
    this.tableName = options.tableName;
    this.idColumn = options.idColumn || 'id';
    this.supabase = options.supabaseClient || supabase;
    this.logger = options.logger || getEnhancedLogger(`repository:${this.tableName}`);
    this.retryOptions = options.retryOptions || {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 3000,
      backoffFactor: 2,
      retryableErrors: ['connection_error', 'timeout', 'server_error'],
    };
    this.cacheTime = options.cacheTime;
    this.softDelete = options.softDelete || false;
    this.deletedColumn = options.deletedColumn || 'deleted_at';
  }
  
  /**
   * Buscar por ID
   * @param id ID do registro
   * @returns Registro encontrado ou null
   */
  async buscarPorId(id: string): Promise<T | null> {
    try {
      this.logger.debug(`Buscando ${this.tableName} por ID: ${id}`);
      
      // Validar ID
      this.validateId(id);
      
      // Criar query
      let queryBuilder = this.supabase
        .from(this.tableName)
        .select('*');
      queryBuilder = queryBuilder.eq(this.idColumn, id);
      
      // Adicionar filtro de soft delete se necessário
      if (this.softDelete) {
        queryBuilder = queryBuilder.eq(this.deletedColumn, null);
      }
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await queryBuilder.single();
      });
      
      if (!result.data) {
        this.logger.debug(`${this.tableName} com ID ${id} não encontrado`);
        return null;
      }
      
      this.logger.debug(`${this.tableName} com ID ${id} encontrado`);
      return result.data as T;
    } catch (error) {
      this.handleError(`buscarPorId:${id}`, error);
      return null;
    }
  }
  
  /**
   * Buscar todos os registros
   * @param filtro Filtro de busca
   * @returns Registros paginados
   */
  async buscarTodos(filtro?: TFilter): Promise<PaginatedResponse<T>> {
    try {
      const defaultFilter: FiltroBase = {
        page: 1,
        limit: 10,
        sort_by: this.idColumn,
        sort_order: 'desc',
      };
      
      // Mesclar filtros
      const mergedFilter = { ...defaultFilter, ...(filtro || {}) } as TFilter;
      
      this.logger.debug(`Buscando todos ${this.tableName}`, { filtro: mergedFilter });
      
      // Calcular paginação
      const page = Number(mergedFilter.page) || 1;
      const limit = Number(mergedFilter.limit) || 10;
      const offset = (page - 1) * limit;
      
      // Criar query base
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });
      
      // Adicionar filtro de soft delete se necessário
      if (this.softDelete) {
        query = query.eq(this.deletedColumn, null);
      }
      
      // Aplicar filtros específicos
      query = this.applyFilters(query, mergedFilter);
      
      // Aplicar ordenação
      if (mergedFilter.sort_by) {
        const order = mergedFilter.sort_order === 'asc' ? true : false;
        query = query.order(mergedFilter.sort_by, { ascending: order });
      }
      
      // Aplicar paginação
      query = query.range(offset, offset + limit - 1);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const total = result.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${dataArray.length} ${this.tableName} encontrados de um total de ${total}`);
      
      return {
        success: true,
        data: dataArray as T[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.handleError('buscarTodos', error);
      return {
        success: false,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
  
  /**
   * Criar um novo registro
   * @param dados Dados do registro
   * @returns Registro criado
   */
  async criar(dados: Partial<T>): Promise<T> {
    try {
      this.logger.debug(`Criando novo ${this.tableName}`, { dados });
      
      // Validar dados
      this.validateData(dados);
      
      // Preparar dados
      const preparedData = this.prepareDataForInsert(dados);
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .insert(preparedData)
        .select('*')
        .single();
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      if (!result.data) {
        throw new DatabaseError(`Falha ao criar ${this.tableName}`);
      }
      
      this.logger.info(`${this.tableName} criado com sucesso`, { 
        id: (result.data as Record<string, unknown>)[this.idColumn], 
      });
      
      return result.data as T;
    } catch (error) {
      this.handleError('criar', error);
      throw error;
    }
  }
  
  /**
   * Atualizar um registro
   * @param id ID do registro
   * @param dados Dados para atualização
   * @returns Registro atualizado
   */
  async atualizar(id: string, dados: Partial<T>): Promise<T> {
    try {
      this.logger.debug(`Atualizando ${this.tableName} com ID ${id}`, { dados });
      
      // Validar ID
      this.validateId(id);
      
      // Validar dados
      this.validateData(dados, true);
      
      // Verificar se registro existe
      const exists = await this.existePorId(id);
      if (!exists) {
        throw new NotFoundError(`${this.tableName} com ID ${id} não encontrado`);
      }
      
      // Preparar dados
      const preparedData = this.prepareDataForUpdate(dados);
      
      // Criar query
      const queryBuilder = this.supabase
        .from(this.tableName)
        .update(preparedData)
        .eq(this.idColumn, id)
        .select('*');
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await queryBuilder.single();
      });
      
      if (!result.data) {
        throw new DatabaseError(`Falha ao atualizar ${this.tableName} com ID ${id}`);
      }
      
      this.logger.info(`${this.tableName} com ID ${id} atualizado com sucesso`);
      
      return result.data as T;
    } catch (error) {
      this.handleError(`atualizar:${id}`, error);
      throw error;
    }
  }
  
  /**
   * Excluir um registro
   * @param id ID do registro
   * @returns True se excluído com sucesso
   */
  async excluir(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Excluindo ${this.tableName} com ID ${id}`);
      
      // Validar ID
      this.validateId(id);
      
      // Verificar se registro existe
      const exists = await this.existePorId(id);
      if (!exists) {
        throw new NotFoundError(`${this.tableName} com ID ${id} não encontrado`);
      }
      
      // Usar soft delete ou hard delete
      if (this.softDelete) {
        // Soft delete - atualizar coluna de exclusão
        const query = this.supabase
          .from(this.tableName)
          .update({ [this.deletedColumn]: new Date().toISOString() })
          .eq(this.idColumn, id)
          .eq(this.deletedColumn, null);
        
        // Executar query com retry
        await this.executeWithRetry(async () => {
          return await query;
        });
      } else {
        // Hard delete - remover registro
        const query = this.supabase
          .from(this.tableName)
          .delete()
          .eq(this.idColumn, id);
        
        // Executar query com retry
        await this.executeWithRetry(async () => {
          return await query;
        });
      }
      
      this.logger.info(`${this.tableName} com ID ${id} excluído com sucesso`);
      
      return true;
    } catch (error) {
      this.handleError(`excluir:${id}`, error);
      throw error;
    }
  }
  
  /**
   * Verificar se um registro existe por ID
   * @param id ID do registro
   * @returns True se existe
   */
  async existePorId(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Verificando se ${this.tableName} com ID ${id} existe`);
      
      // Validar ID
      this.validateId(id);
      
      // Criar query
      let query = this.supabase
        .from(this.tableName)
        .select(this.idColumn, { count: 'exact', head: true })
        .eq(this.idColumn, id);
      
      // Adicionar filtro de soft delete se necessário
      if (this.softDelete) {
        query = query.eq(this.deletedColumn, null);
      }
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const exists = (result.count || 0) > 0;
      
      this.logger.debug(`${this.tableName} com ID ${id} ${exists ? 'existe' : 'não existe'}`);
      
      return exists;
    } catch (error) {
      this.handleError(`existePorId:${id}`, error);
      return false;
    }
  }
  
  /**
   * Executar uma query com retry
   * @param queryFn Função de query
   * @returns Resultado da query
   */
  protected async executeWithRetry<TResult>(
    queryFn: () => Promise<{ data: TResult | null; error: unknown; count?: number }>,
  ): Promise<{ data: TResult | null; error: unknown; count?: number }> {
    // Iniciar timer para métricas de performance
    const startTime = performance.now();
    const operationId = `${this.tableName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      this.logger.debug('Iniciando operação de banco de dados', {
        operationId,
        table: this.tableName,
      });
      
      const result = await executeWithRetry(
        async () => {
          const result = await queryFn();
          
          if (result.error) {
            // Verificar se é um erro retryable
            const errorCode = this.getErrorCode(result.error);
            
            if (this.isRetryableError(errorCode)) {
              this.logger.warn('Erro retryable detectado, tentando novamente', {
                operationId,
                errorCode,
                errorMessage: typeof result.error === 'object' && result.error !== null && 'message' in result.error ? String((result.error as { message?: unknown }).message) : undefined,
              });
              
              throw new RetryableError(
                `Erro retryable na operação: ${errorCode}`,
                result.error,
              );
            }
            
            // Não é retryable, lançar erro normal
            throw result.error;
          }
          
          return result;
        },
        this.retryOptions,
      );
      
      // Calcular tempo de execução
      const executionTime = performance.now() - startTime;
      
      // Registrar métricas de performance
      this.logger.debug('Operação de banco de dados concluída com sucesso', {
        operationId,
        table: this.tableName,
        executionTimeMs: executionTime.toFixed(2),
        resultSize: result.data ? 
          (Array.isArray(result.data) ? result.data.length : 1) : 0,
        totalCount: result.count,
      });
      
      return result;
    } catch (error) {
      // Calcular tempo até o erro
      const executionTime = performance.now() - startTime;
      
      // Registrar erro
      this.logger.error('Erro na operação de banco de dados', {
        operationId,
        table: this.tableName,
        executionTimeMs: executionTime.toFixed(2),
        errorType: error instanceof RetryableError ? 'retryable' : 'non-retryable',
        errorCode: this.getErrorCode(error),
      });
      
      // Converter para DatabaseError
      if (error instanceof RetryableError) {
        let dbMessage = 'Erro após tentativas de retry';
        let dbCause: unknown = undefined;
        if (typeof error === 'object' && error !== null) {
          if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
            dbMessage = `Erro após ${this.retryOptions.maxRetries} tentativas: ${(error as { message: string }).message}`;
          }
          if ('cause' in error) {
            dbCause = (error as { cause?: unknown }).cause;
          }
        }
        throw new DatabaseError(dbMessage, { cause: dbCause });
      }
      
      throw error;
    }
  }
  
  /**
   * Aplicar filtros à query
   * @param query Query base
   * @param filtro Filtro a ser aplicado
   * @returns Query com filtros aplicados
   */
  protected applyFilters<TQuery extends object>(query: TQuery, _filtro: TFilter): TQuery {
    // Implementação base - deve ser sobrescrita por classes filhas para filtros específicos
    return query;
  }
  
  /**
   * Preparar dados para inserção
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForInsert(dados: Partial<T>): Record<string, unknown> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    const preparedData = { ...dados as Record<string, unknown> };
    
    // Adicionar timestamps padrão se não fornecidos
    if (!preparedData.criado_em) {
      preparedData.criado_em = new Date().toISOString();
    }
    
    if (!preparedData.atualizado_em) {
      preparedData.atualizado_em = new Date().toISOString();
    }
    
    return preparedData;
  }
  
  /**
   * Preparar dados para atualização
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForUpdate(dados: Partial<T>): Record<string, unknown> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    const preparedData = { ...dados as Record<string, unknown> };
    
    // Atualizar timestamp de atualização
    preparedData.atualizado_em = new Date().toISOString();
    
    return preparedData;
  }
  
  /**
   * Validar ID
   * @param id ID a ser validado
   */
  protected validateId(id: string): void {
    if (!id) {
      throw new ValidationError('ID não pode ser vazio');
    }
    
    // Validar UUID se for o caso
    if (this.isUuidColumn() && !this.isValidUuid(id)) {
      throw new ValidationError(`ID inválido: ${id}`);
    }
  }
  
  /**
   * Validar dados
   * @param dados Dados a serem validados
   * @param isUpdate Se é uma operação de atualização
   */
  protected validateData(dados: Partial<T>, isUpdate: boolean = false): void {
    // Implementação base - deve ser sobrescrita por classes filhas
    if (!dados || Object.keys(dados).length === 0) {
      throw new ValidationError('Dados não podem ser vazios');
    }
    
    // Validações específicas para operações de criação
    if (!isUpdate) {
      // Adicionar validações específicas para criação
    }
    
    // Validações específicas para operações de atualização
    if (isUpdate) {
      // Adicionar validações específicas para atualização
    }
  }
  
  /**
   * Verificar se a coluna de ID é UUID
   * @returns True se for UUID
   */
  protected isUuidColumn(): boolean {
    // Por padrão, assume que ID é UUID
    return true;
  }
  
  /**
   * Validar UUID
   * @param uuid UUID a ser validado
   * @returns True se for válido
   */
  protected isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  /**
   * Obter código de erro
   * @param error Erro
   * @returns Código de erro
   */
  protected getErrorCode(error: unknown): string {
    if (!error) return 'unknown_error';
    if (typeof error === 'object' && error !== null) {
      const err = error as { code?: string; name?: string; message?: string; status?: number };
      if (err.code) return err.code;
      if (err.name === 'FetchError') return 'connection_error';
      if (err.name === 'AbortError') return 'timeout';
      if (err.message && typeof err.message === 'string') {
        if (err.message.includes('timeout')) return 'timeout';
        if (err.message.includes('connection')) return 'connection_error';
        if (err.message.includes('too many connections')) return 'connection_limit';
      }
      if (typeof err.status === 'number') {
        if (err.status >= 500) return 'server_error';
        if (err.status === 429) return 'rate_limit';
        if (err.status === 408) return 'timeout';
      }
    }
    return 'unknown_error';
  }
  
  /**
   * Verificar se um erro é retryable
   * @param errorCode Código de erro
   * @returns True se for retryable
   */
  protected isRetryableError(errorCode: string): boolean {
    return this.retryOptions.retryableErrors.includes(errorCode);
  }
  
  /**
   * Tratar erro
   * @param operation Operação que gerou o erro
   * @param error Erro
   */
  protected handleError(operation: string, error: unknown): void {
    // Log detalhado do erro
    const err = error as { message?: string; details?: string; hint?: string };
    const errorObj = error instanceof Error ? error : new Error(err && typeof err.message === 'string' ? err.message : 'Erro desconhecido');
    this.logger.error(
      `Erro em ${this.tableName}.${operation}`,
      {
        error: err.message,
        code: this.getErrorCode(error),
        details: err.details || err.hint || undefined,
      },
      errorObj,
    );
    
    // Relançar erro apropriado
    if (error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof DatabaseError) {
      throw error;
    }
    
    // Converter para DatabaseError
    throw new DatabaseError(
      `Erro em ${this.tableName}.${operation}: ${err.message || 'Erro desconhecido'}`,
      { cause: error },
    );
  }
}