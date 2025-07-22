import { z } from 'zod';
import { BaseRouteHandler } from '../../../core/api/base-route-handler';
import { ResponseFormatter } from '../../../core/api/response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../../../core/api';
import { URL } from 'url';
import type { Request } from 'express';

/**
 * Concurso categorias API route handler
 */
export class ConcursoCategoriasRouteHandler extends BaseRouteHandler {
  constructor() {
    super('categorias');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Get validation schema for adding categoria to concurso
   */
  protected getPOSTBodySchema(): z.ZodSchema {
    return z.object({
      categoria_id: z.string().uuid(),
      ordem: z.number().int().positive().optional(),
    });
  }

  /**
   * Get validation schema for updating concurso categoria
   */
  protected getPUTBodySchema(): z.ZodSchema {
    return z.object({
      ordem: z.number().int().positive(),
    });
  }

  /**
   * Handle GET request - Get categorias for a concurso
   */
  protected async handleGET(
    request: Request,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get concurso ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/categorias
      
      if (!concursoId || concursoId === 'concursos') {
        return ResponseFormatter.error('Concurso ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Check if concurso exists
      const { data: concurso, error: concursoError } = await supabase
        .from('concursos')
        .select('id, nome')
        .eq('id', concursoId)
        .single();

      if (concursoError) {
        if (concursoError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
        }

        this.logger.error('Error fetching concurso', {
          requestId: context.requestId,
          concursoId,
          error: concursoError.message,
        });

        return ResponseFormatter.error('Error retrieving concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get categorias for concurso
      const { data, error }: { data: unknown[] | null; error: unknown } = await supabase
        .from('concurso_categorias')
        .select(`
          id,
          ordem,
          categorias:categoria_id (
            id,
            nome,
            descricao,
            parent_id
          )
        `)
        .eq('concurso_id', concursoId)
        .order('ordem', { ascending: true });

      if (error) {
        this.logger.error('Error fetching concurso categorias', {
          requestId: context.requestId,
          concursoId,
          error: error && typeof error === 'object' && 'message' in error ? error.message : String(error),
        });

        return ResponseFormatter.error('Error retrieving concurso categorias', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Format response
      type CategoriaItem = {
        id: string;
        ordem: number;
        categorias: {
          id: string;
          nome: string;
          descricao?: string;
          parent_id?: string;
        };
      };
      const formattedCategorias = (data ?? []).map((item: CategoriaItem) => ({
        id: item.id,
        ordem: item.ordem,
        categoria: item.categorias,
      }));

      return ResponseFormatter.success({
        concurso: {
          id: concurso.id,
          nome: concurso.nome,
        },
        categorias: formattedCategorias,
      }, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get concurso categorias request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving concurso categorias', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle POST request - Add categoria to concurso
   */
  protected async handlePOST(
    request: Request & { context?: { user?: { role?: string } } },
    context: {
      body?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      const user = (request as { context?: { user?: { role?: string } } }).context?.user;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can add categorias to concursos', context.requestId);
      }

      // Get concurso ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/categorias
      
      if (!concursoId || concursoId === 'concursos') {
        return ResponseFormatter.error('Concurso ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      const data = context.body as {
        categoria_id: string;
        ordem?: number;
      };

      // Check if concurso exists
      const { error: concursoError } = await supabase
        .from('concursos')
        .select('id')
        .eq('id', concursoId)
        .single();

      if (concursoError) {
        if (concursoError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
        }

        this.logger.error('Error fetching concurso', {
          requestId: context.requestId,
          concursoId,
          error: concursoError.message,
        });

        return ResponseFormatter.error('Error retrieving concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Check if categoria exists
      const { data: categoria, error: categoriaError } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('id', data.categoria_id)
        .single();

      if (categoriaError) {
        if (categoriaError.code === 'PGRST116') {
          return ResponseFormatter.error('Categoria not found', {
            status: 400,
            requestId: context.requestId,
          });
        }

        this.logger.error('Error fetching categoria', {
          requestId: context.requestId,
          categoriaId: data.categoria_id,
          error: categoriaError.message,
        });

        return ResponseFormatter.error('Error retrieving categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Check if categoria is already added to concurso
      const { data: existingRelation } = await supabase
        .from('concurso_categorias')
        .select('id')
        .eq('concurso_id', concursoId)
        .eq('categoria_id', data.categoria_id)
        .single();

      if (existingRelation) {
        return ResponseFormatter.error('Categoria already added to concurso', {
          status: 409,
          code: 'ALREADY_EXISTS',
          requestId: context.requestId,
        });
      }

      // Get max ordem if not provided
      let ordem = data.ordem;
      if (!ordem) {
        const { data: maxOrdem } = await supabase
          .from('concurso_categorias')
          .select('ordem')
          .eq('concurso_id', concursoId)
          .order('ordem', { ascending: false })
          .limit(1)
          .single();

        ordem = (maxOrdem?.ordem || 0) + 1;
      }

      // Add categoria to concurso
      const { data: newRelation, error } = await supabase
        .from('concurso_categorias')
        .insert({
          concurso_id: concursoId,
          categoria_id: data.categoria_id,
          ordem,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error adding categoria to concurso', {
          requestId: context.requestId,
          concursoId,
          categoriaId: data.categoria_id,
          error: error.message,
        });

        return ResponseFormatter.error('Error adding categoria to concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        {
          id: newRelation.id,
          concurso_id: concursoId,
          categoria_id: data.categoria_id,
          categoria_nome: categoria.nome,
          ordem: newRelation.ordem,
        },
        {
          status: 201,
          requestId: context.requestId,
          message: 'Categoria added to concurso successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling add categoria to concurso request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error adding categoria to concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PUT request - Update concurso categoria
   */
  protected async handlePUT(
    request: Request & { context?: { user?: { role?: string } } },
    context: {
      body?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      const user = (request as { context?: { user?: { role?: string } } }).context?.user;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can update concurso categorias', context.requestId);
      }

      // Get concurso ID and categoria ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 3]; // Assuming URL pattern is /concursos/{concursoId}/categorias/{categoriaId}
      const categoriaId = pathParts[pathParts.length - 1];
      
      if (!concursoId || concursoId === 'concursos' || !categoriaId || categoriaId === 'categorias') {
        return ResponseFormatter.error('Concurso ID and categoria ID are required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      const data = context.body as {
        ordem: number;
      };

      // Check if relation exists
      const { data: existingRelation, error: checkError } = await supabase
        .from('concurso_categorias')
        .select('id')
        .eq('concurso_id', concursoId)
        .eq('categoria_id', categoriaId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Categoria not found in concurso', context.requestId);
        }

        this.logger.error('Error checking concurso categoria relation', {
          requestId: context.requestId,
          concursoId,
          categoriaId,
          error: checkError.message,
        });

        return ResponseFormatter.error('Error checking concurso categoria relation', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Update relation
      const { data: updatedRelation, error } = await supabase
        .from('concurso_categorias')
        .update({
          ordem: data.ordem,
        })
        .eq('id', existingRelation.id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating concurso categoria', {
          requestId: context.requestId,
          concursoId,
          categoriaId,
          error: error.message,
        });

        return ResponseFormatter.error('Error updating concurso categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        updatedRelation,
        {
          requestId: context.requestId,
          message: 'Concurso categoria updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling update concurso categoria request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating concurso categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle DELETE request - Remove categoria from concurso
   */
  protected async handleDELETE(
    request: Request & { context?: { user?: { role?: string } } },
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user has admin role
      const user = (request as { context?: { user?: { role?: string } } }).context?.user;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can remove categorias from concursos', context.requestId);
      }

      // Get concurso ID and categoria ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 3]; // Assuming URL pattern is /concursos/{concursoId}/categorias/{categoriaId}
      const categoriaId = pathParts[pathParts.length - 1];
      
      if (!concursoId || concursoId === 'concursos' || !categoriaId || categoriaId === 'categorias') {
        return ResponseFormatter.error('Concurso ID and categoria ID are required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Check if relation exists
      const { data: existingRelation, error: checkError } = await supabase
        .from('concurso_categorias')
        .select('id')
        .eq('concurso_id', concursoId)
        .eq('categoria_id', categoriaId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Categoria not found in concurso', context.requestId);
        }

        this.logger.error('Error checking concurso categoria relation', {
          requestId: context.requestId,
          concursoId,
          categoriaId,
          error: checkError.message,
        });

        return ResponseFormatter.error('Error checking concurso categoria relation', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Delete relation
      const { error } = await supabase
        .from('concurso_categorias')
        .delete()
        .eq('id', existingRelation.id);

      if (error) {
        this.logger.error('Error removing categoria from concurso', {
          requestId: context.requestId,
          concursoId,
          categoriaId,
          error: error.message,
        });

        return ResponseFormatter.error('Error removing categoria from concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { deleted: true },
        {
          requestId: context.requestId,
          message: 'Categoria removed from concurso successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling remove categoria from concurso request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error removing categoria from concurso', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }
}

// Create route handler
const concursoCategoriasRouteHandler = new ConcursoCategoriasRouteHandler();
const routeHandlers = concursoCategoriasRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const DELETE = routeHandlers.DELETE;