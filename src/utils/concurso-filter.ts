import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper para filtrar conteúdo automaticamente pelo concurso do usuário
 */
export class ConcursoFilter {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Obtém o concurso ativo do usuário
   */
  async getUserConcurso(userId: string): Promise<string | null> {
    try {
      const { data: preference, error } = await this.supabase
        .from('user_concurso_preferences')
        .select('concurso_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !preference) {
        return null;
      }

      return preference.concurso_id;
    } catch (error) {
      console.error('Erro ao obter concurso do usuário:', error);
      return null;
    }
  }

  /**
   * Aplica filtro de concurso em uma query
   */
  async applyConcursoFilter<T>(
    query: any,
    userId: string,
    tableName: string
  ): Promise<any> {
    const concursoId = await this.getUserConcurso(userId);
    
    if (!concursoId) {
      // Se não tem concurso selecionado, retorna query vazia
      return query.eq('id', '00000000-0000-0000-0000-000000000000'); // UUID inválido
    }

    // Aplicar filtro por concurso
    return query.eq('concurso_id', concursoId);
  }

  /**
   * Verifica se o usuário tem acesso ao recurso específico
   */
  async hasAccessToResource(
    userId: string,
    resourceId: string,
    tableName: string
  ): Promise<boolean> {
    try {
      const concursoId = await this.getUserConcurso(userId);
      
      if (!concursoId) {
        return false;
      }

      const { data, error } = await this.supabase
        .from(tableName)
        .select('id')
        .eq('id', resourceId)
        .eq('concurso_id', concursoId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Erro ao verificar acesso ao recurso:', error);
      return false;
    }
  }

  /**
   * Middleware para rotas que precisam de filtro por concurso
   */
  static async withConcursoFilter(
    supabase: SupabaseClient,
    userId: string,
    callback: (concursoId: string | null) => Promise<any>
  ) {
    const filter = new ConcursoFilter(supabase);
    const concursoId = await filter.getUserConcurso(userId);
    return callback(concursoId);
  }
}

/**
 * Função helper para aplicar filtro de concurso em queries
 */
export async function applyConcursoFilterToQuery(
  supabase: SupabaseClient,
  userId: string,
  query: any,
  tableName: string
): Promise<any> {
  const filter = new ConcursoFilter(supabase);
  return filter.applyConcursoFilter(query, userId, tableName);
}

/**
 * Função helper para verificar acesso a recurso específico
 */
export async function checkConcursoAccess(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  tableName: string
): Promise<boolean> {
  const filter = new ConcursoFilter(supabase);
  return filter.hasAccessToResource(userId, resourceId, tableName);
} 