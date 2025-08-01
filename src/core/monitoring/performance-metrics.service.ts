import { logger } from '../../lib/logger.js';

/**
 * Serviço de métricas de performance para monitoramento do sistema
 * Coleta e analisa métricas de autenticação, banco de dados e cache
 */
export class PerformanceMetricsService {
  private static instance: PerformanceMetricsService;
  
  // Métricas de autenticação
  private authTime: number = 0;
  private authCount: number = 0;
  private authErrors: number = 0;
  
  // Métricas de banco de dados
  private dbQueries: number = 0;
  private dbQueryTime: number = 0;
  private dbErrors: number = 0;
  
  // Métricas de cache
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private cacheSize: number = 0;
  
  // Métricas de resposta da API
  private apiRequests: number = 0;
  private apiResponseTime: number = 0;
  private apiErrors: number = 0;

  public static getInstance(): PerformanceMetricsService {
    if (!PerformanceMetricsService.instance) {
      PerformanceMetricsService.instance = new PerformanceMetricsService();
    }
    return PerformanceMetricsService.instance;
  }

  /**
   * Registra tempo de autenticação
   */
  public recordAuthTime(time: number): void {
    this.authTime += time;
    this.authCount++;
    
    if (time > 1000) { // Log se demorar mais de 1 segundo
      logger.warn('Autenticação lenta detectada', { time, average: this.getAverageAuthTime() });
    }
  }

  /**
   * Registra erro de autenticação
   */
  public recordAuthError(): void {
    this.authErrors++;
  }

  /**
   * Registra consulta ao banco de dados
   */
  public recordDbQuery(time: number): void {
    this.dbQueries++;
    this.dbQueryTime += time;
    
    if (time > 500) { // Log se demorar mais de 500ms
      logger.warn('Consulta de banco lenta detectada', { time, average: this.getAverageDbQueryTime() });
    }
  }

  /**
   * Registra erro de banco de dados
   */
  public recordDbError(): void {
    this.dbErrors++;
  }

  /**
   * Registra hit no cache
   */
  public recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Registra miss no cache
   */
  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Atualiza tamanho do cache
   */
  public updateCacheSize(size: number): void {
    this.cacheSize = size;
  }

  /**
   * Registra requisição da API
   */
  public recordApiRequest(time: number): void {
    this.apiRequests++;
    this.apiResponseTime += time;
    
    if (time > 2000) { // Log se demorar mais de 2 segundos
      logger.warn('Resposta de API lenta detectada', { time, average: this.getAverageApiResponseTime() });
    }
  }

  /**
   * Registra erro da API
   */
  public recordApiError(): void {
    this.apiErrors++;
  }

  /**
   * Obtém estatísticas completas
   */
  public getStats(): {
    auth: {
      total: number;
      average: number;
      errors: number;
      errorRate: number;
    };
    database: {
      queries: number;
      average: number;
      errors: number;
      errorRate: number;
    };
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
      size: number;
    };
    api: {
      requests: number;
      average: number;
      errors: number;
      errorRate: number;
    };
    } {
    return {
      auth: {
        total: this.authCount,
        average: this.getAverageAuthTime(),
        errors: this.authErrors,
        errorRate: this.authCount > 0 ? this.authErrors / this.authCount : 0,
      },
      database: {
        queries: this.dbQueries,
        average: this.getAverageDbQueryTime(),
        errors: this.dbErrors,
        errorRate: this.dbQueries > 0 ? this.dbErrors / this.dbQueries : 0,
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.getCacheHitRate(),
        size: this.cacheSize,
      },
      api: {
        requests: this.apiRequests,
        average: this.getAverageApiResponseTime(),
        errors: this.apiErrors,
        errorRate: this.apiRequests > 0 ? this.apiErrors / this.apiRequests : 0,
      },
    };
  }

  /**
   * Obtém tempo médio de autenticação
   */
  private getAverageAuthTime(): number {
    return this.authCount > 0 ? this.authTime / this.authCount : 0;
  }

  /**
   * Obtém tempo médio de consulta ao banco
   */
  private getAverageDbQueryTime(): number {
    return this.dbQueries > 0 ? this.dbQueryTime / this.dbQueries : 0;
  }

  /**
   * Obtém tempo médio de resposta da API
   */
  private getAverageApiResponseTime(): number {
    return this.apiRequests > 0 ? this.apiResponseTime / this.apiRequests : 0;
  }

  /**
   * Obtém taxa de hit do cache
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Reseta todas as métricas
   */
  public resetMetrics(): void {
    this.authTime = 0;
    this.authCount = 0;
    this.authErrors = 0;
    this.dbQueries = 0;
    this.dbQueryTime = 0;
    this.dbErrors = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheSize = 0;
    this.apiRequests = 0;
    this.apiResponseTime = 0;
    this.apiErrors = 0;
    
    logger.info('Métricas de performance resetadas');
  }

  /**
   * Loga resumo das métricas
   */
  public logSummary(): void {
    const stats = this.getStats();
    
    logger.info('Resumo de Performance', {
      auth: {
        total: stats.auth.total,
        average: `${stats.auth.average.toFixed(2)}ms`,
        errorRate: `${(stats.auth.errorRate * 100).toFixed(2)}%`,
      },
      database: {
        queries: stats.database.queries,
        average: `${stats.database.average.toFixed(2)}ms`,
        errorRate: `${(stats.database.errorRate * 100).toFixed(2)}%`,
      },
      cache: {
        hitRate: `${(stats.cache.hitRate * 100).toFixed(2)}%`,
        size: stats.cache.size,
      },
      api: {
        requests: stats.api.requests,
        average: `${stats.api.average.toFixed(2)}ms`,
        errorRate: `${(stats.api.errorRate * 100).toFixed(2)}%`,
      },
    });
  }
}

// Instância singleton
export const performanceMetrics = PerformanceMetricsService.getInstance(); 