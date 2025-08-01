// backend/src/config/supabase-unified.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseDebugWrapper } from '../core/utils/debug-logger.js';
import 'dotenv/config';

/**
 * Gerencia a instância do cliente Supabase para garantir que apenas uma
 * conexão seja criada e reutilizada em toda a aplicação (padrão Singleton).
 */
export class SupabaseManager {
  private static instance: SupabaseClient;

  /**
   * Obtém a instância única do cliente Supabase.
   * Se a instância ainda não existir, ela será criada.
   *
   * @returns A instância do SupabaseClient.
   * @throws {Error} Se as credenciais do Supabase não estiverem configuradas.
   */
  public static getInstance(): SupabaseClient {
    if (!SupabaseManager.instance) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new Error('As credenciais do Supabase (URL e Service Role Key) são obrigatórias.');
      }

      const client = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      });

      // Aplicar wrapper de debug se estiver em modo debug
      if (process.env.NODE_ENV === 'development' && 
          (process.env.DEBUG === 'true' || process.argv.includes('--debug'))) {
        SupabaseManager.instance = createSupabaseDebugWrapper(client);
      } else {
        SupabaseManager.instance = client;
      }
    }

    return SupabaseManager.instance;
  }

  /**
   * Reseta a instância do cliente Supabase.
   * Usado principalmente para testes ou para forçar uma reconexão.
   */
  public static resetInstance(): void {
    SupabaseManager.instance = null as SupabaseClient;
  }

  // Função para executar queries SQL customizadas
  async executeQuery<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T[]> {
    const { data, error } = await SupabaseManager.instance.rpc('execute_query', {
      query,
      params,
    });

    if (error) {
      throw new Error(`Erro ao executar query: ${error.message}`);
    }

    return data as T[];
  }
}

/**
 * Exporta a instância única do cliente Supabase para ser usada na aplicação.
 */
export const supabase = SupabaseManager.getInstance(); 