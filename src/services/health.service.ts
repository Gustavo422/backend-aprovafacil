import { supabase } from '../config/supabase-unified.js';

export class HealthService {
  private supabase: typeof supabase;

  constructor() {
    this.supabase = supabase;
  }

  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
      database: boolean;
      cache: boolean;
    };
  }> {
    const timestamp = new Date().toISOString();
    
    try {
      // Verificar conexão com banco
      const { error: dbError } = await this.supabase.from('usuarios').select('count').limit(1);
      const database = !dbError;

      return {
        status: database ? 'healthy' : 'unhealthy',
        timestamp,
        services: {
          database,
          cache: true, // Cache sempre disponível localmente
        },
      };
    } catch {
      return {
        status: 'unhealthy',
        timestamp,
        services: {
          database: false,
          cache: false,
        },
      };
    }
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
      database: boolean;
      cache: boolean;
    };
  }> {
    return this.checkHealth();
  }
}