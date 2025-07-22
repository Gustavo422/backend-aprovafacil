import { z } from 'zod';
import { CrudRouteHandler } from '../../core/api/crud-route-handler';
import { ResponseFormatter } from '../../core/api/response-formatter';
import { SupabaseConfig } from '../../core/database/supabase.js';
import { requestLoggingMiddleware, corsMiddleware } from '../../core/api';

// Create Supabase client
const supabaseClient = SupabaseConfig.getInstance();

// Define concurso interface
interface Concurso {
  id: string;
  nome: string;
  organizador: string;
  data_prova: string;
  inscricoes_inicio: string;
  inscricoes_fim: string;
  status: 'ativo' | 'inativo' | 'encerrado' | 'cancelado';
  descricao?: string;
  edital_url?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Index signature para compatibilidade com CrudRouteHandler
}

/**
 * Concurso API route handler
 */
export class ConcursoRouteHandler extends CrudRouteHandler<Record<string, unknown>> {
  constructor() {
    super('concursos');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Get validation schema for concurso creation
   */
  protected getCreateSchema(): z.ZodSchema {
    return z.object({
      nome: z.string().min(3).max(200),
      organizador: z.string().min(2).max(100),
      data_prova: z.string().datetime(),
      inscricoes_inicio: z.string().datetime(),
      inscricoes_fim: z.string().datetime(),
      status: z.enum(['ativo', 'inativo', 'encerrado', 'cancelado']).default('ativo'),
      descricao: z.string().max(2000).optional(),
      edital_url: z.string().url().optional(),
    });
  }

  /**
   * Get validation schema for concurso update
   */
  protected getUpdateSchema(): z.ZodSchema {
    return z.object({
      nome: z.string().min(3).max(200).optional(),
      organizador: z.string().min(2).max(100).optional(),
      data_prova: z.string().datetime().optional(),
      inscricoes_inicio: z.string().datetime().optional(),
      inscricoes_fim: z.string().datetime().optional(),
      status: z.enum(['ativo', 'inativo', 'encerrado', 'cancelado']).optional(),
      descricao: z.string().max(2000).optional(),
      edital_url: z.string().url().optional(),
    });
  }

  /**
   * Get validation schema for query parameters
   */
  protected getQuerySchema(): z.ZodSchema {
    return z.object({
      page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
      status: z.enum(['ativo', 'inativo', 'encerrado', 'cancelado']).optional(),
      search: z.string().optional(),
      organizador: z.string().optional(),
      data_inicio: z.string().datetime().optional(),
      data_fim: z.string().datetime().optional(),
    });
  }

  /**
   * Check if POST/PUT/DELETE methods require admin role
   */
  protected isPOSTAuthRequired(): boolean {
    return true;
  }

  protected isPUTAuthRequired(): boolean {
    return true;
  }

  protected isDELETEAuthRequired(): boolean {
    return true;
  }

  /**
   * Handle getting a list of concursos
   */
  protected async handleGetList(
    query: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      status?: 'ativo' | 'inativo' | 'encerrado' | 'cancelado';
      search?: string;
      organizador?: string;
      data_inicio?: string;
      data_fim?: string;
    },
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'data_prova',
        order = 'asc',
        status,
        search,
        organizador,
        data_inicio,
        data_fim,
      } = query;

      // Start building the query
      let concursosQuery = supabaseClient
        .from('concursos')
        .select('*, concurso_categorias(*)');

      // Apply filters
      if (status) {
        concursosQuery = concursosQuery.eq('status', status);
      }

      if (search) {
        concursosQuery = concursosQuery.ilike('nome', `%${search}%`);
      }

      if (organizador) {
        concursosQuery = concursosQuery.eq('organizador', organizador);
      }

      if (data_inicio) {
        concursosQuery = concursosQuery.gte('data_prova', data_inicio);
      }

      if (data_fim) {
        concursosQuery = concursosQuery.lte('data_prova', data_fim);
      }

      // Get total count for pagination
      const { count, error: countError } = await supabaseClient
        .from('concursos')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.logger.error('Error counting concursos', {
          requestId: context.requestId,
          error: countError.message,
        });

        return ResponseFormatter.error('Error retrieving concursos', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Apply pagination and sorting
      const { data, error }: { data: unknown; error: unknown } = await concursosQuery
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        this.logger.error('Error fetching concursos', {
          requestId: context.requestId,
          error: error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error retrieving concursos', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Format concursos with categories
      const formattedConcursos = (Array.isArray(data) ? data : []).map((concurso: Record<string, unknown>) => {
        const { concurso_categorias, ...concursoData } = concurso;
        return {
          ...concursoData,
          categorias: concurso_categorias,
        };
      });

      // Calculate pagination info
      const totalPages = Math.ceil((count || 0) / limit);

      return ResponseFormatter.paginated(formattedConcursos, {
        page,
        limit,
        total: count || 0,
        totalPages,
      }, context.requestId);
    } catch (error) {
      this.logger.error('Error handling concurso list request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving concursos', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle getting a single concurso
   */
  protected async handleGetOne(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get concurso data
      const { data, error } = await supabaseClient
        .from('concursos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
        }

        this.logger.error('Error fetching concurso', {
          requestId: context.requestId,
          concursoId: id,
          error: error.message,
        });

        return ResponseFormatter.error('Error retrieving concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get related categories
      const { data: categorias } = await supabaseClient
        .from('concurso_categorias')
        .select('*')
        .eq('concurso_id', id);

      // Return concurso with categories
      return ResponseFormatter.success({
        ...data,
        categorias: categorias || [],
      }, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get concurso request', {
        requestId: context.requestId,
        concursoId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle creating a concurso
   */
  protected async handleCreate(
    data: Concurso,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can create concursos', context.requestId);
      }

      // Create concurso in database
      const { data: newConcurso, error } = await supabaseClient
        .from('concursos')
        .insert({
          nome: data.nome,
          organizador: data.organizador,
          data_prova: data.data_prova,
          inscricoes_inicio: data.inscricoes_inicio,
          inscricoes_fim: data.inscricoes_fim,
          status: data.status,
          descricao: data.descricao,
          edital_url: data.edital_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating concurso', {
          requestId: context.requestId,
          error: error.message,
        });

        return ResponseFormatter.error('Error creating concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        newConcurso,
        {
          status: 201,
          requestId: context.requestId,
          message: 'Concurso created successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling create concurso request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error creating concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle updating a concurso
   */
  protected async handleUpdate(
    id: string,
    data: Concurso,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can update concursos', context.requestId);
      }

      // Check if concurso exists
      const { data: existingConcurso, error: checkError } = await supabaseClient
        .from('concursos')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingConcurso) {
        return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
      }

      // Update concurso in database
      const { data: updatedConcurso, error } = await supabaseClient
        .from('concursos')
        .update({
          nome: data.nome,
          organizador: data.organizador,
          data_prova: data.data_prova,
          inscricoes_inicio: data.inscricoes_inicio,
          inscricoes_fim: data.inscricoes_fim,
          status: data.status,
          descricao: data.descricao,
          edital_url: data.edital_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating concurso', {
          requestId: context.requestId,
          concursoId: id,
          error: error.message,
        });

        return ResponseFormatter.error('Error updating concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        updatedConcurso,
        {
          requestId: context.requestId,
          message: 'Concurso updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling update concurso request', {
        requestId: context.requestId,
        concursoId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle partial update of a concurso
   */
  protected async handlePartialUpdate(
    id: string,
    data: Partial<Concurso>,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can update concursos', context.requestId);
      }

      // Check if concurso exists
      const { data: existingConcurso, error: checkError } = await supabaseClient
        .from('concursos')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingConcurso) {
        return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Add fields to update
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.organizador !== undefined) updateData.organizador = data.organizador;
      if (data.data_prova !== undefined) updateData.data_prova = data.data_prova;
      if (data.inscricoes_inicio !== undefined) updateData.inscricoes_inicio = data.inscricoes_inicio;
      if (data.inscricoes_fim !== undefined) updateData.inscricoes_fim = data.inscricoes_fim;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.edital_url !== undefined) updateData.edital_url = data.edital_url;

      // Update concurso in database
      const { data: updatedConcurso, error } = await supabaseClient
        .from('concursos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating concurso', {
          requestId: context.requestId,
          concursoId: id,
          error: error.message,
        });

        return ResponseFormatter.error('Error updating concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        updatedConcurso,
        {
          requestId: context.requestId,
          message: 'Concurso updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling partial update concurso request', {
        requestId: context.requestId,
        concursoId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle removing a concurso
   */
  protected async handleRemove(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can delete concursos', context.requestId);
      }

      // Check if concurso exists
      const { data: existingConcurso, error: checkError } = await supabaseClient
        .from('concursos')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingConcurso) {
        return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
      }

      // Delete related categories first
      await supabaseClient
        .from('concurso_categorias')
        .delete()
        .eq('concurso_id', id);

      // Delete concurso from database
      const { error } = await supabaseClient
        .from('concursos')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Error deleting concurso', {
          requestId: context.requestId,
          concursoId: id,
          error: error.message,
        });

        return ResponseFormatter.error('Error deleting concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { deleted: true },
        {
          requestId: context.requestId,
          message: 'Concurso deleted successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling delete concurso request', {
        requestId: context.requestId,
        concursoId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error deleting concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }
}

// Create route handler
const concursoRouteHandler = new ConcursoRouteHandler();
const routeHandlers = concursoRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;