import type { CacheManager } from './cache-manager.js';
import type { ILogService } from '../interfaces/index.js';

/**
 * Cache service específico para dados relacionados ao concurso ativo
 */
export class ConcursoCacheService {
  private readonly cacheManager: CacheManager;
  private readonly logService: ILogService;
  private readonly CACHE_PREFIX = 'concurso_active';
  private readonly DEFAULT_TTL = 300; // 5 minutos

  constructor(cacheManager: CacheManager, logService: ILogService) {
    this.cacheManager = cacheManager;
    this.logService = logService;
  }

  /**
   * Gerar chave de cache para dados do concurso
   */
  private generateKey(concursoId: string, dataType: string, additionalParams?: Record<string, string | number | boolean>): string {
    const params = additionalParams ? `_${JSON.stringify(additionalParams)}` : '';
    return `${this.CACHE_PREFIX}:${concursoId}:${dataType}${params}`;
  }

  /**
   * Cache para dados básicos do concurso
   */
  async getConcursoData<T>(concursoId: string): Promise<T | null> {
    const key = this.generateKey(concursoId, 'basic');
    return this.cacheManager.get<T>(key);
  }

  async setConcursoData<T>(concursoId: string, data: T): Promise<void> {
    const key = this.generateKey(concursoId, 'basic');
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL * 2 }); // 10 minutos para dados básicos
  }

  /**
   * Cache para apostilas do concurso
   */
  async getApostilas<T>(concursoId: string, filters?: Record<string, string | number | boolean>): Promise<T | null> {
    const key = this.generateKey(concursoId, 'apostilas', filters);
    return this.cacheManager.get<T>(key);
  }

  async setApostilas<T>(concursoId: string, data: T, filters?: Record<string, string | number | boolean>): Promise<void> {
    const key = this.generateKey(concursoId, 'apostilas', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Cache para simulados do concurso
   */
  async getSimulados<T>(concursoId: string, filters?: Record<string, string | number | boolean>): Promise<T | null> {
    const key = this.generateKey(concursoId, 'simulados', filters);
    return this.cacheManager.get<T>(key);
  }

  async setSimulados<T>(concursoId: string, data: T, filters?: Record<string, string | number | boolean>): Promise<void> {
    const key = this.generateKey(concursoId, 'simulados', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Cache para flashcards do concurso
   */
  async getFlashcards<T>(concursoId: string, filters?: Record<string, string | number | boolean>): Promise<T | null> {
    const key = this.generateKey(concursoId, 'flashcards', filters);
    return this.cacheManager.get<T>(key);
  }

  async setFlashcards<T>(concursoId: string, data: T, filters?: Record<string, string | number | boolean>): Promise<void> {
    const key = this.generateKey(concursoId, 'flashcards', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Cache para questões semanais do concurso
   */
  async getQuestoesSemanais<T>(concursoId: string, filters?: Record<string, string | number | boolean>): Promise<T | null> {
    const key = this.generateKey(concursoId, 'questoes_semanais', filters);
    return this.cacheManager.get<T>(key);
  }

  async setQuestoesSemanais<T>(concursoId: string, data: T, filters?: Record<string, string | number | boolean>): Promise<void> {
    const key = this.generateKey(concursoId, 'questoes_semanais', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Cache para estatísticas do concurso
   */
  async getEstatisticas<T>(concursoId: string, userId?: string): Promise<T | null> {
    const filters = userId ? { userId } : undefined;
    const key = this.generateKey(concursoId, 'estatisticas', filters);
    return this.cacheManager.get<T>(key);
  }

  async setEstatisticas<T>(concursoId: string, data: T, userId?: string): Promise<void> {
    const filters = userId ? { userId } : undefined;
    const key = this.generateKey(concursoId, 'estatisticas', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Cache para dashboard do concurso
   */
  async getDashboard<T>(concursoId: string, userId?: string): Promise<T | null> {
    const filters = userId ? { userId } : undefined;
    const key = this.generateKey(concursoId, 'dashboard', filters);
    return this.cacheManager.get<T>(key);
  }

  async setDashboard<T>(concursoId: string, data: T, userId?: string): Promise<void> {
    const filters = userId ? { userId } : undefined;
    const key = this.generateKey(concursoId, 'dashboard', filters);
    await this.cacheManager.set(key, data, { ttl: this.DEFAULT_TTL });
  }

  /**
   * Invalidar cache específico do concurso
   */
  async invalidateConcurso(concursoId: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:${concursoId}:*`;
    await this.cacheManager.clear(pattern);
    await this.logService.info(`Cache do concurso ${concursoId} invalidado`);
  }

  /**
   * Invalidar cache específico de um tipo de dado
   */
  async invalidateDataType(concursoId: string, dataType: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:${concursoId}:${dataType}*`;
    await this.cacheManager.clear(pattern);
    await this.logService.info(`Cache de ${dataType} do concurso ${concursoId} invalidado`);
  }

  /**
   * Limpar todo o cache de concursos
   */
  async clearAll(): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:*`;
    await this.cacheManager.clear(pattern);
    await this.logService.info('Todo o cache de concursos foi limpo');
  }

  /**
   * Obter estatísticas do cache de concursos
   */
  async getStats(): Promise<Record<string, unknown>> {
    const stats = await this.cacheManager.getStats();
    return {
      type: 'concurso_cache',
      ...(stats && typeof stats === 'object' ? stats : {}),
    };
  }
} 