import { SupabaseClient } from '@supabase/supabase-js';
import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('concurso-filter');

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
  async getUserConcurso(usuarioId: string): Promise<string | null> {
    try {
      const { data: preference, error } = await this.supabase
        .from('preferencias_usuario_concurso')
        .select('concurso_id')
        .eq('usuario_id', usuarioId)
        .eq('ativo', true)
        .single();

      if (error) {
        // Verificar se é um erro de "não encontrado"
        if (error.code === 'PGRST116') {
          logger.info(`Nenhuma preferência ativa encontrada para o usuário ${usuarioId}`);
          
          // Tentar buscar o concurso mais recente do usuário (mesmo que não esteja ativo)
          const { data: lastPreference, error: lastError } = await this.supabase
            .from('preferencias_usuario_concurso')
            .select('concurso_id')
            .eq('usuario_id', usuarioId)
            .order('criado_em', { ascending: false })
            .limit(1)
            .single();
            
          if (!lastError && lastPreference) {
            logger.info(`Usando concurso mais recente como fallback para o usuário ${usuarioId}`);
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
            logger.info(`Usando concurso padrão como fallback para o usuário ${usuarioId}`);
            return defaultConcurso.id;
          }
        } else if (error.code === '42703') {
          // Erro de coluna não existente (problema com usuario_id vs usuario_id)
          logger.error('Erro de esquema de banco de dados:', { error: error.message });
        } else {
          logger.error('Erro ao buscar preferência de concurso:', { error: error.message });
        }
        return null;
      }

      if (!preference) {
        return null;
      }

      return preference.concurso_id;
    } catch (error) {
      logger.error('Erro ao obter concurso do usuário:', { error });
      return null;
    }
  }

  /**
   * Aplica filtro de concurso em uma query
   */
  async applyConcursoFilter<T extends QueryWithEq>(
    query: T,
    usuarioId: string,
    _tablenome: string,
  ): Promise<T> {
    const concursoId = await this.getUserConcurso(usuarioId);
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
    usuarioId: string,
    resourceId: string,
    tablenome: string,
  ): Promise<boolean> {
    try {
      const concursoId = await this.getUserConcurso(usuarioId);
      
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
      logger.error('Erro ao verificar acesso ao recurso:', { error });
      return false;
    }
  }

  /**
   * Middleware para rotas que precisam de filtro por concurso
   */
  static async withConcursoFilter(
    supabase: SupabaseClient,
    usuarioId: string,
    callback: (concursoId: string | null) => Promise<unknown>,
  ): Promise<unknown> {
    const filter = new ConcursoFilter(supabase);
    const concursoId = await filter.getUserConcurso(usuarioId);
    return callback(concursoId);
  }
}

/**
 * Função helper para aplicar filtro de concurso em queries
 * @returns {Promise<T>} O builder da query filtrada
 */
export async function applyConcursoFilterToQuery<T extends QueryWithEq>(
  supabase: SupabaseClient,
  usuarioId: string,
  query: T,
  _tablenome: string,
): Promise<T> {
  const filter = new ConcursoFilter(supabase);
  return filter.applyConcursoFilter(query, usuarioId, _tablenome);
}

/**
 * Função helper para verificar acesso a recurso específico
 */
export async function checkConcursoAccess(
  supabase: SupabaseClient,
  usuarioId: string,
  resourceId: string,
  tablenome: string,
): Promise<boolean> {
  const filter = new ConcursoFilter(supabase);
  return filter.hasAccessToResource(usuarioId, resourceId, tablenome);
} 

/**
 * Função utilitária para obter o concurso ativo do usuário (exportada para uso externo)
 */
export async function getUserConcurso(supabase: SupabaseClient, usuarioId: string): Promise<string | null> {
  try {
    const { data: preference, error } = await supabase
      .from('preferencias_usuario_concurso')
      .select('concurso_id')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)
      .single();

    if (error) {
      // Verificar se é um erro de "não encontrado"
      if (error.code === 'PGRST116') {
        logger.info(`Nenhuma preferência ativa encontrada para o usuário ${usuarioId}`);
        
        // Tentar buscar o concurso mais recente do usuário (mesmo que não esteja ativo)
        const { data: lastPreference, error: lastError } = await supabase
          .from('preferencias_usuario_concurso')
          .select('concurso_id')
          .eq('usuario_id', usuarioId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .single();
          
        if (!lastError && lastPreference) {
          logger.info(`Usando concurso mais recente como fallback para o usuário ${usuarioId}`);
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
          logger.info(`Usando concurso padrão como fallback para o usuário ${usuarioId}`);
          return defaultConcurso.id;
        }
      } else if (error.code === '42703') {
        // Erro de coluna não existente (problema com usuario_id vs usuario_id)
        logger.error('Erro de esquema de banco de dados:', { error: error.message });
      } else {
        logger.error('Erro ao buscar preferência de concurso:', { error: error.message });
      }
      return null;
    }

    if (!preference) {
      return null;
    }

    return preference.concurso_id;
  } catch (error) {
    logger.error('Erro ao obter concurso do usuário:', { error });
    return null;
  }
} 



