// Cache Controller for Admin Panel
import { Request, Response } from 'express';
import { CacheManager } from '../../core/utils/cache-manager.js';
import { CacheProvider } from '../../core/utils/cache-factory.js';
import { ILogService } from '../../core/interfaces/index.js';
import { CacheDependencyType } from '../../core/utils/cache-invalidation.strategy.js';

export class CacheController {
  private cacheManager: CacheManager;
  private logService: ILogService;
  
  constructor(cacheManager: CacheManager, logService: ILogService) {
    this.cacheManager = cacheManager;
    this.logService = logService;
  }
  
  /**
   * Get cache statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.cacheManager.getStats();
      
      res.json({
        success: true,
        data: stats,
        message: 'Estatísticas de cache obtidas com sucesso',
      });
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de cache', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao obter estatísticas de cache',
        message: (error as Error).message,
      });
    }
  }
  
  /**
   * Clear all cache
   */
  async clearAll(req: Request, res: Response): Promise<void> {
    try {
      await this.cacheManager.clear();
      
      res.json({
        success: true,
        message: 'Cache limpo com sucesso',
      });
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar cache',
        message: (error as Error).message,
      });
    }
  }
  
  /**
   * Clear cache by pattern
   */
  async clearByPattern(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        res.status(400).json({
          success: false,
          error: 'Padrão de cache é obrigatório',
          message: 'Informe um padrão para limpar o cache',
        });
        return;
      }
      
      await this.cacheManager.clear(pattern);
      
      res.json({
        success: true,
        message: `Cache com padrão "${pattern}" limpo com sucesso`,
      });
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache por padrão', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao limpar cache por padrão',
        message: (error as Error).message,
      });
    }
  }
  
  /**
   * Invalidate cache by entity
   */
  async invalidateByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { type, id } = req.body;
      
      if (!type || !id) {
        res.status(400).json({
          success: false,
          error: 'Tipo e ID são obrigatórios',
          message: 'Informe o tipo e ID da entidade para invalidar o cache',
        });
        return;
      }
      
      // Validate type
      if (!Object.values(CacheDependencyType).includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de entidade inválido',
          message: `Tipo deve ser um dos seguintes: ${Object.values(CacheDependencyType).join(', ')}`,
        });
        return;
      }
      
      await this.cacheManager.invalidate({
        type: type as CacheDependencyType,
        id,
      });
      
      res.json({
        success: true,
        message: `Cache para ${type} com ID ${id} invalidado com sucesso`,
      });
    } catch (error) {
      await this.logService.erro('Erro ao invalidar cache por entidade', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao invalidar cache por entidade',
        message: (error as Error).message,
      });
    }
  }
  
  /**
   * Get cache configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        provider: process.env.CACHE_PROVIDER || CacheProvider.MEMORY,
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '30', 10),
        maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
        redis: {
          url: process.env.REDIS_URL ? 'Configurado' : 'Não configurado',
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'aprovafacil:',
        },
      };
      
      res.json({
        success: true,
        data: config,
        message: 'Configuração de cache obtida com sucesso',
      });
    } catch (error) {
      await this.logService.erro('Erro ao obter configuração de cache', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao obter configuração de cache',
        message: (error as Error).message,
      });
    }
  }
  
  /**
   * Get cache keys
   */
  async getKeys(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder - actual implementation would depend on the cache provider
      // For Redis, we could use SCAN to get keys
      // For in-memory cache, we could expose a method to get keys
      
      res.status(501).json({
        success: false,
        error: 'Método não implementado',
        message: 'Esta funcionalidade ainda não está disponível',
      });
    } catch (error) {
      await this.logService.erro('Erro ao obter chaves de cache', error as Error);
      
      res.status(500).json({
        success: false,
        error: 'Erro ao obter chaves de cache',
        message: (error as Error).message,
      });
    }
  }
}

export default CacheController;