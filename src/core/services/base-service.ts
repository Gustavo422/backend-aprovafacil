import { IBaseService, IBaseRepository } from '../interfaces/index.js';
import { FiltroBase, PaginatedResponse, ApiResponse } from '../../shared/types/index.js';
import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { ValidationError, NotFoundError, DatabaseError } from '../errors/index.js';
import { performance } from 'perf_hooks';

/**
 * Opções para o serviço base
 */
export interface BaseServiceOptions {
  /**
   * Nome do serviço
   */
  serviceName: string;
  
  /**
   * Logger
   */
  logger?: EnhancedLogger;
  
  /**
   * Habilitar cache
   */
  enableCache?: boolean;
  
  /**
   * Tempo de cache em segundos
   */
  cacheTime?: number;
}

/**
 * Interface para validador
 */
export interface IValidator<T> {
  /**
   * Validar dados
   * @param data Dados a serem validados
   * @returns Resultado da validação
   */
  validate(data: T): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Classe base para serviços
 */
export abstract class BaseService<T, TFilter extends FiltroBase = FiltroBase> implements IBaseService<T, TFilter> {
  /**
   * Nome do serviço
   */
  protected readonly serviceName: string;
  
  /**
   * Logger
   */
  protected readonly logger: EnhancedLogger;
  
  /**
   * Repositório
   */
  protected readonly repository: IBaseRepository<T, TFilter>;
  
  /**
   * Habilitar cache
   */
  protected readonly enableCache: boolean;
  
  /**
   * Tempo de cache em segundos
   */
  protected readonly cacheTime: number;
  
  /**
   * Cache simples em memória
   */
  private cache = new Map<string, { data: unknown; expiry: number }>();
  
  /**
   * Construtor
   * @param repository Repositório
   * @param options Opções do serviço
   */
  constructor(
    repository: IBaseRepository<T, TFilter>,
    options: BaseServiceOptions
  ) {
    this.repository = repository;
    this.serviceName = options.serviceName;
    this.logger = options.logger || getEnhancedLogger(`service:${this.serviceName}`);
    this.enableCache = options.enableCache || false;
    this.cacheTime = options.cacheTime || 300; // 5 minutos por padrão
    
    this.logger.info(`Serviço ${this.serviceName} inicializado`);
  }
  
  /**
   * Buscar por ID
   * @param id ID do registro
   * @returns Resposta da API com o registro
   */
  async buscarPorId(id: string): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const operationId = `${this.serviceName}-buscarPorId-${Date.now()}`;
    
    try {
      this.logger.debug(`Buscando ${this.serviceName} por ID: ${id}`, { operationId });
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarPorId:${id}`);
        if (cached && typeof cached === 'object' && !('pagination' in cached)) {
          this.logger.debug(`Cache hit para ${this.serviceName}:${id}`, { operationId });
          return {
            success: true,
            data: cached as T
          };
        }
      }
      
      // Validar entrada
      await this.validateInput({ id }, 'buscarPorId');
      
      // Buscar no repositório
      const data = await this.repository.buscarPorId(id);
      
      if (!data) {
        const executionTime = performance.now() - startTime;
        this.logger.warn(`${this.serviceName} com ID ${id} não encontrado`, {
          operationId,
          executionTimeMs: executionTime.toFixed(2)
        });
        
        return {
          success: false,
          message: `${this.serviceName} não encontrado`,
          error: 'NOT_FOUND'
        };
      }
      
      // Processar dados após busca
      const processedData = await this.processAfterFind(data);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorId:${id}`, processedData as T);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug(`${this.serviceName} encontrado com sucesso`, {
        operationId,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `buscarPorId:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Buscar todos os registros
   * @param filtro Filtro de busca
   * @returns Resposta paginada
   */
  async buscarTodos(filtro?: TFilter): Promise<PaginatedResponse<T>> {
    const startTime = performance.now();
    const operationId = `${this.serviceName}-buscarTodos-${Date.now()}`;
    
    try {
      this.logger.debug(`Buscando todos ${this.serviceName}`, { 
        operationId, 
        filtro 
      });
      
      // Verificar cache
      if (this.enableCache) {
        const cacheKey = `buscarTodos:${JSON.stringify(filtro || {})}`;
        const cached = this.getFromCache(cacheKey);
        if (cached && typeof cached === 'object' && 'pagination' in cached) {
          this.logger.debug(`Cache hit para buscarTodos`, { operationId });
          return cached as PaginatedResponse<T>;
        }
      }
      
      // Validar entrada
      await this.validateInput(filtro || {}, 'buscarTodos');
      
      // Buscar no repositório
      const result = await this.repository.buscarTodos(filtro);
      
      // Processar dados após busca
      const processedData = await Promise.all(
        result.data.map(item => this.processAfterFind(item))
      );
      
      const response: PaginatedResponse<T> = {
        success: true,
        data: processedData,
        pagination: result.pagination
      };
      
      // Salvar no cache
      if (this.enableCache) {
        const cacheKey = `buscarTodos:${JSON.stringify(filtro || {})}`;
        this.setCache(cacheKey, response);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug(`${processedData.length} ${this.serviceName} encontrados`, {
        operationId,
        executionTimeMs: executionTime.toFixed(2),
        total: result.pagination.total
      });
      
      return response;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorResponse = this.handleError(error, 'buscarTodos', operationId, executionTime);
      
      return {
        success: false,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        error: errorResponse.error,
        message: errorResponse.message
      };
    }
  }
  
  /**
   * Criar um novo registro
   * @param dados Dados do registro
   * @returns Resposta da API com o registro criado
   */
  async criar(dados: Partial<T>): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const operationId = `${this.serviceName}-criar-${Date.now()}`;
    
    try {
      this.logger.debug(`Criando novo ${this.serviceName}`, { 
        operationId,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateInput(dados, 'criar');
      
      // Processar dados antes da criação
      const processedData = await this.processBeforeCreate(dados);
      
      // Validar regras de negócio
      await this.validateBusinessRules(processedData, 'criar');
      
      // Criar no repositório
      const createdData = await this.repository.criar(processedData);
      
      // Processar dados após criação
      const finalData = await this.processAfterCreate(createdData);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('criar');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info(`${this.serviceName} criado com sucesso`, {
        operationId,
        executionTimeMs: executionTime.toFixed(2),
        id: typeof finalData === 'object' && finalData !== null && 'id' in finalData ? (finalData as { id?: unknown }).id : undefined
      });
      
      return {
        success: true,
        data: finalData,
        message: `${this.serviceName} criado com sucesso`
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, 'criar', operationId, executionTime);
    }
  }
  
  /**
   * Atualizar um registro
   * @param id ID do registro
   * @param dados Dados para atualização
   * @returns Resposta da API com o registro atualizado
   */
  async atualizar(id: string, dados: Partial<T>): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const operationId = `${this.serviceName}-atualizar-${Date.now()}`;
    
    try {
      this.logger.debug(`Atualizando ${this.serviceName} com ID ${id}`, {
        operationId,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateInput({ id, ...dados }, 'atualizar');
      
      // Processar dados antes da atualização
      const processedData = await this.processBeforeUpdate(dados);
      
      // Validar regras de negócio
      await this.validateBusinessRules(processedData, 'atualizar', id);
      
      // Atualizar no repositório
      const updatedData = await this.repository.atualizar(id, processedData);
      
      // Processar dados após atualização
      const finalData = await this.processAfterUpdate(updatedData);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', id);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info(`${this.serviceName} atualizado com sucesso`, {
        operationId,
        executionTimeMs: executionTime.toFixed(2),
        id
      });
      
      return {
        success: true,
        data: finalData,
        message: `${this.serviceName} atualizado com sucesso`
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `atualizar:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Excluir um registro
   * @param id ID do registro
   * @returns Resposta da API
   */
  async excluir(id: string): Promise<ApiResponse<boolean>> {
    const startTime = performance.now();
    const operationId = `${this.serviceName}-excluir-${Date.now()}`;
    
    try {
      this.logger.debug(`Excluindo ${this.serviceName} com ID ${id}`, { operationId });
      
      // Validar entrada
      await this.validateInput({ id }, 'excluir');
      
      // Validar regras de negócio para exclusão
      await this.validateBusinessRules({}, 'excluir', id);
      
      // Processar antes da exclusão
      await this.processBeforeDelete(id);
      
      // Excluir no repositório
      const deleted = await this.repository.excluir(id);
      
      // Processar após exclusão
      await this.processAfterDelete(id);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('excluir', id);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info(`${this.serviceName} excluído com sucesso`, {
        operationId,
        executionTimeMs: executionTime.toFixed(2),
        id
      });
      
      return {
        success: true,
        data: deleted,
        message: `${this.serviceName} excluído com sucesso`
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Forçar o tipo de retorno para ApiResponse<boolean>
      const errorResponse = this.handleError(error, `excluir:${id}`, operationId, executionTime);
      return {
        ...errorResponse,
        data: false
      };
    }
  }
  
  /**
   * Validar entrada
   * @param data Dados a serem validados
   * @param operation Operação sendo executada
   */
  protected async validateInput(data: Partial<T> | TFilter | { id: string } | undefined, _operation: string): Promise<void> {
    if (!data) {
      throw new ValidationError('Dados não podem ser vazios');
    }
  }
  
  /**
   * Validar regras de negócio
   * @param data Dados a serem validados
   * @param operation Operação sendo executada
   * @param id ID do registro (para operações de atualização/exclusão)
   */
  protected async validateBusinessRules(_data: Partial<T>, _operation: string, _id?: string): Promise<void> {
    // Implementação base - deve ser sobrescrita por classes filhas
  }
  
  /**
   * Processar dados antes da criação
   * @param data Dados a serem processados
   * @returns Dados processados
   */
  protected async processBeforeCreate(data: Partial<T>): Promise<Partial<T>> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    return data;
  }
  
  /**
   * Processar dados após criação
   * @param data Dados criados
   * @returns Dados processados
   */
  protected async processAfterCreate(data: T): Promise<T> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    return data;
  }
  
  /**
   * Processar dados antes da atualização
   * @param data Dados a serem processados
   * @returns Dados processados
   */
  protected async processBeforeUpdate(data: Partial<T>): Promise<Partial<T>> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    return data;
  }
  
  /**
   * Processar dados após atualização
   * @param data Dados atualizados
   * @returns Dados processados
   */
  protected async processAfterUpdate(data: T): Promise<T> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    return data;
  }
  
  /**
   * Processar antes da exclusão
   * @param id ID do registro a ser excluído
   */
  protected async processBeforeDelete(_id: string): Promise<void> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
  }
  
  /**
   * Processar após exclusão
   * @param id ID do registro excluído
   */
  protected async processAfterDelete(_id: string): Promise<void> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
  }
  
  /**
   * Processar dados após busca
   * @param data Dados encontrados
   * @returns Dados processados
   */
  protected async processAfterFind(data: T): Promise<T> {
    // Implementação base - deve ser sobrescrita por classes filhas se necessário
    return data;
  }
  
  /**
   * Sanitizar dados para log
   * @param data Dados a serem sanitizados
   * @returns Dados sanitizados
   */
  protected sanitizeLogData(data: Partial<T> | Record<string, unknown>): Partial<T> | Record<string, unknown> {
    const sensitiveFields = ['senha', 'password', 'token', 'secret', 'key'];
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
  
  /**
   * Obter dados do cache
   * @param key Chave do cache
   * @returns Dados do cache ou null
   */
  protected getFromCache(key: string): T | PaginatedResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (cached.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // Validação básica: se for objeto e tiver 'pagination', assume PaginatedResponse
    if (typeof cached.data === 'object' && cached.data !== null && 'pagination' in cached.data) {
      return cached.data as PaginatedResponse<T>;
    }
    return cached.data as T;
  }
  
  /**
   * Salvar dados no cache
   * @param key Chave do cache
   * @param data Dados a serem salvos
   */
  protected setCache(key: string, data: unknown): void {
    const expiry = Date.now() + this.cacheTime * 1000;
    this.cache.set(key, { data, expiry });
  }
  
  /**
   * Limpar cache relacionado
   * @param operation Operação executada
   * @param id ID do registro (opcional)
   */
  protected clearRelatedCache(operation: string, id?: string): void {
    // Limpar cache específico do ID
    if (id) {
      this.cache.delete(`buscarPorId:${id}`);
    }
    
    // Limpar cache de listagens
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith('buscarTodos:')) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
  
  /**
   * Tratar erro
   * @param error Erro
   * @param operation Operação que gerou o erro
   * @param operationId ID da operação
   * @param executionTime Tempo de execução
   * @returns Resposta de erro
   */
  protected handleError(
    error: unknown, 
    operation: string, 
    operationId: string, 
    executionTime: number
  ): ApiResponse<T> {
    // Log detalhado do erro
    const err = error as Error & { message?: string; stack?: string; errors?: string[] };
    this.logger.error(
      `Erro em ${this.serviceName}.${operation}`,
      {
        operationId,
        executionTimeMs: executionTime.toFixed(2),
        error: err.message,
        stack: err.stack
      },
      err
    );
    
    // Retornar resposta apropriada baseada no tipo de erro
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        erros: error.errors
      } as ApiResponse<T>;
    }
    
    if (error instanceof NotFoundError) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: error.message
      } as ApiResponse<T>;
    }
    
    if (error instanceof DatabaseError) {
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro interno do servidor'
      } as ApiResponse<T>;
    }
    
    // Erro genérico
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor'
    } as ApiResponse<T>;
  }
}