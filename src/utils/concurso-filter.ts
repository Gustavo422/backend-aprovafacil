import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface para builders que possuem método eq
 */
interface QueryWithEq {
  eq(field: string, value: unknown): unknown;
}

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
        .from('preferencias_usuario_concurso')
        .select('concurso_id')
        .eq('usuario_id', userId)
        .eq('ativo', true)
        .single();

      if (error) {
        // Verificar se é um erro de "não encontrado"
        if (error.code === 'PGRST116') {
          console.log(`Nenhuma preferência ativa encontrada para o usuário ${userId}`);
          
          // Tentar buscar o concurso mais recente do usuário (mesmo que não esteja ativo)
          const { data: lastPreference, error: lastError } = await this.supabase
            .from('preferencias_usuario_concurso')
            .select('concurso_id')
            .eq('usuario_id', userId)
            .order('criado_em', { ascending: false })
            .limit(1)
            .single();
            
          if (!lastError && lastPreference) {
            console.log(`Usando concurso mais recente como fallback para o usuário ${userId}`);
            return lastPreference.concurso_id;
          }
          
          // Se não encontrar nenhuma preferência, tentar buscar o concurso padrão
          const { data: defaultConcurso, error: defaultError } = await this.supabase
            .from('concursos')
            .select('id')
            .eq('ativo', true)
            .order('criado_em', { ascending: false })
            .limit(1)
            .single();
            
          if (!defaultError && defaultConcurso) {
            console.log(`Usando concurso padrão como fallback para o usuário ${userId}`);
            return defaultConcurso.id;
          }
        } else if (error.code === '42703') {
          // Erro de coluna não existente (problema com user_id vs usuario_id)
          console.error('Erro de esquema de banco de dados:', error.message);
        } else {
          console.error('Erro ao buscar preferência de concurso:', error.message);
        }
        return null;
      }

      if (!preference) {
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
  async applyConcursoFilter<T extends QueryWithEq>(
    query: T,
    userId: string,
    _tablenome: string
  ): Promise<T> {
    const concursoId = await this.getUserConcurso(userId);
    if (!concursoId) {
      return query;
    }
    // Só aplica o filtro se query for um builder (tiver eq)
    if (typeof query.eq === 'function') {
      return query.eq('concurso_id', concursoId) as T;
    }
    return query;
  }

  /**
   * Verifica se o usuário tem acesso ao recurso específico
   */
  async hasAccessToResource(
    userId: string,
    resourceId: string,
    tablenome: string
  ): Promise<boolean> {
    try {
      const concursoId = await this.getUserConcurso(userId);
      
      if (!concursoId) {
        return false;
      }

      const { data, error } = await this.supabase
        .from(tablenome)
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
    callback: (concursoId: string | null) => Promise<unknown>
  ): Promise<unknown> {
    const filter = new ConcursoFilter(supabase);
    const concursoId = await filter.getUserConcurso(userId);
    return callback(concursoId);
  }
}

/**
 * Função helper para aplicar filtro de concurso em queries
 * @returns {Promise<T>} O builder da query filtrada
 */
export async function applyConcursoFilterToQuery<T extends QueryWithEq>(
  supabase: SupabaseClient,
  userId: string,
  query: T,
  _tablenome: string
): Promise<T> {
  const filter = new ConcursoFilter(supabase);
  return filter.applyConcursoFilter(query, userId, _tablenome);
}

/**
 * Função helper para verificar acesso a recurso específico
 */
export async function checkConcursoAccess(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  tablenome: string
): Promise<boolean> {
  const filter = new ConcursoFilter(supabase);
  return filter.hasAccessToResource(userId, resourceId, tablenome);
} 

/**
 * Função utilitária para obter o concurso ativo do usuário (exportada para uso externo)
 */
export async function getUserConcurso(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data: preference, error } = await supabase
      .from('preferencias_usuario_concurso')
      .select('concurso_id')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .single();

    if (error) {
      // Verificar se é um erro de "não encontrado"
      if (error.code === 'PGRST116') {
        console.log(`Nenhuma preferência ativa encontrada para o usuário ${userId}`);
        
        // Tentar buscar o concurso mais recente do usuário (mesmo que não esteja ativo)
        const { data: lastPreference, error: lastError } = await supabase
          .from('preferencias_usuario_concurso')
          .select('concurso_id')
          .eq('usuario_id', userId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .single();
          
        if (!lastError && lastPreference) {
          console.log(`Usando concurso mais recente como fallback para o usuário ${userId}`);
          return lastPreference.concurso_id;
        }
        
        // Se não encontrar nenhuma preferência, tentar buscar o concurso padrão
        const { data: defaultConcurso, error: defaultError } = await supabase
          .from('concursos')
          .select('id')
          .eq('ativo', true)
          .order('criado_em', { ascending: false })
          .limit(1)
          .single();
          
        if (!defaultError && defaultConcurso) {
          console.log(`Usando concurso padrão como fallback para o usuário ${userId}`);
          return defaultConcurso.id;
        }
      } else if (error.code === '42703') {
        // Erro de coluna não existente (problema com user_id vs usuario_id)
        console.error('Erro de esquema de banco de dados:', error.message);
      } else {
        console.error('Erro ao buscar preferência de concurso:', error.message);
      }
      return null;
    }

    if (!preference) {
      return null;
    }

    return preference.concurso_id;
  } catch (error) {
    console.error('Erro ao obter concurso do usuário:', error);
    return null;
  }
} 



