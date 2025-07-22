import { z } from 'zod';
import { CrudRouteHandler } from '../../core/api/crud-route-handler';
import { ResponseFormatter } from '../../core/api/response-formatter';
import { SupabaseConfig } from '../../core/database/supabase.js';
import { requestLoggingMiddleware, corsMiddleware } from '../../core/api';

// Create Supabase client
const supabaseClient = SupabaseConfig.getInstance();

// Define categoria interface
interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  parent_id?: string;
  ordem?: number;
  created_at: string;
  updated_at: string;
}

// Definir tipo auxiliar para categorias com filhos
interface CategoriaComFilhos extends Categoria {
  children: CategoriaComFilhos[];
}

/**
 * Categoria API route handler
 */
export class CategoriaRouteHandler extends CrudRouteHandler<Record<string, unknown>> {
  constructor() {
    super('categorias');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Get validation schema for categoria creation
   */
  protected getCreateSchema(): z.ZodSchema {
    return z.object({
      nome: z.string().min(2).max(100),
      descricao: z.string().max(500).optional(),
      parent_id: z.string().uuid().optional(),
      ordem: z.number().int().positive().optional(),
    });
  }

  /**
   * Get validation schema for categoria update
   */
  protected getUpdateSchema(): z.ZodSchema {
    return z.object({
      nome: z.string().min(2).max(100).optional(),
      descricao: z.string().max(500).optional(),
      parent_id: z.string().uuid().optional().nullable(),
      ordem: z.number().int().positive().optional(),
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
      parent_id: z.string().uuid().optional(),
      search: z.string().optional(),
      hierarchy: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
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
   * Handle getting a list of categorias
   */
  protected async handleGetList(
    query: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      parent_id?: string;
      search?: string;
      hierarchy?: boolean;
    },
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'ordem',
        order = 'asc',
        parent_id,
        search,
        hierarchy = false,
      } = query;

      // If hierarchy is requested, return hierarchical structure
      if (hierarchy) {
        return this.getHierarchicalCategorias(context.requestId);
      }

      // Start building the query
      let categoriasQuery = supabaseClient
        .from('categorias')
        .select('*');

      // Apply filters
      if (parent_id) {
        categoriasQuery = categoriasQuery.eq('parent_id', parent_id);
      } else if (parent_id === null) {
        categoriasQuery = categoriasQuery.is('parent_id', null);
      }

      if (search) {
        categoriasQuery = categoriasQuery.ilike('nome', `%${search}%`);
      }

      // Get total count for pagination
      const { count, error: countError } = await supabaseClient
        .from('categorias')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.logger.error('Error counting categorias', {
          requestId: context.requestId,
          error: (typeof countError === 'object' && countError && 'message' in countError) ? (countError as { message: string }).message : String(countError),
        });

        return ResponseFormatter.error('Error retrieving categorias', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Apply pagination and sorting
      const { data, error }: { data: unknown[]; error: unknown } = await categoriasQuery
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        this.logger.error('Error fetching categorias', {
          requestId: context.requestId,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error retrieving categorias', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Calculate pagination info
      const totalPages = Math.ceil((count || 0) / limit);

      return ResponseFormatter.paginated(data, {
        page,
        limit,
        total: count || 0,
        totalPages,
      }, context.requestId);
    } catch (error) {
      this.logger.error('Error handling categoria list request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving categorias', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle getting a single categoria
   */
  protected async handleGetOne(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get categoria data
      const { data, error }: { data: unknown; error: unknown } = await supabaseClient
        .from('categorias')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Categoria not found', context.requestId);
        }

        this.logger.error('Error fetching categoria', {
          requestId: context.requestId,
          categoriaId: id,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error retrieving categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get child categorias
      const { data: children } = await supabaseClient
        .from('categorias')
        .select('id, nome, ordem')
        .eq('parent_id', id)
        .order('ordem', { ascending: true });

      // Return categoria with children
      return ResponseFormatter.success({
        ...(typeof data === 'object' && data !== null ? { ...data, children: children || [] } : { children: children || [] }),
      }, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get categoria request', {
        requestId: context.requestId,
        categoriaId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle creating a categoria
   */
  protected async handleCreate(
    data: Record<string, unknown>,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can create categorias', context.requestId);
      }

      // Cast para Categoria
      const categoriaData = data as Partial<Categoria>;

      // If parent_id is provided, check if it exists
      if (categoriaData.parent_id) {
        const { data: parentCategoria, error: parentError } = await supabaseClient
          .from('categorias')
          .select('id')
          .eq('id', categoriaData.parent_id)
          .single();

        if (parentError || !parentCategoria) {
          return ResponseFormatter.error('Parent categoria not found', {
            status: 400,
            requestId: context.requestId,
          });
        }
      }

      // Create categoria in database
      const { data: newCategoria, error } = await supabaseClient
        .from('categorias')
        .insert({
          nome: categoriaData.nome,
          descricao: categoriaData.descricao,
          parent_id: categoriaData.parent_id,
          ordem: categoriaData.ordem || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating categoria', {
          requestId: context.requestId,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error creating categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        newCategoria,
        {
          status: 201,
          requestId: context.requestId,
          message: 'Categoria created successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling create categoria request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error creating categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle updating a categoria
   */
  protected async handleUpdate(
    id: string,
    data: Record<string, unknown>,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can update categorias', context.requestId);
      }

      // Cast para Categoria
      const categoriaData = data as Partial<Categoria>;

      // Check if categoria exists
      const { data: existingCategoria, error: checkError } = await supabaseClient
        .from('categorias')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingCategoria) {
        return ResponseFormatter.notFoundError('Categoria not found', context.requestId);
      }

      // If parent_id is provided, check if it exists and prevent circular references
      if (categoriaData.parent_id) {
        // Check if parent exists
        const { data: parentCategoria, error: parentError } = await supabaseClient
          .from('categorias')
          .select('id')
          .eq('id', categoriaData.parent_id)
          .single();

        if (parentError || !parentCategoria) {
          return ResponseFormatter.error('Parent categoria not found', {
            status: 400,
            requestId: context.requestId,
          });
        }

        // Prevent circular references
        if (categoriaData.parent_id === id) {
          return ResponseFormatter.error('Categoria cannot be its own parent', {
            status: 400,
            requestId: context.requestId,
          });
        }

        // Check if the new parent is not a descendant of this categoria
        const isDescendant = await this.isDescendant(categoriaData.parent_id, id);
        if (isDescendant) {
          return ResponseFormatter.error('Cannot set a descendant as parent (circular reference)', {
            status: 400,
            requestId: context.requestId,
          });
        }
      }

      // Update categoria in database
      const { data: updatedCategoria, error } = await supabaseClient
        .from('categorias')
        .update({
          nome: categoriaData.nome,
          descricao: categoriaData.descricao,
          parent_id: categoriaData.parent_id,
          ordem: categoriaData.ordem,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating categoria', {
          requestId: context.requestId,
          categoriaId: id,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error updating categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        updatedCategoria,
        {
          requestId: context.requestId,
          message: 'Categoria updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling update categoria request', {
        requestId: context.requestId,
        categoriaId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle partial update of a categoria
   */
  protected async handlePartialUpdate(
    id: string,
    data: Record<string, unknown>,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can update categorias', context.requestId);
      }

      // Cast para Categoria
      const categoriaData = data as Partial<Categoria>;

      // Check if categoria exists
      const { data: existingCategoria, error: checkError } = await supabaseClient
        .from('categorias')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingCategoria) {
        return ResponseFormatter.notFoundError('Categoria not found', context.requestId);
      }

      // If parent_id is provided, check if it exists and prevent circular references
      if (categoriaData.parent_id) {
        // Check if parent exists
        const { data: parentCategoria, error: parentError } = await supabaseClient
          .from('categorias')
          .select('id')
          .eq('id', categoriaData.parent_id)
          .single();

        if (parentError || !parentCategoria) {
          return ResponseFormatter.error('Parent categoria not found', {
            status: 400,
            requestId: context.requestId,
          });
        }

        // Prevent circular references
        if (categoriaData.parent_id === id) {
          return ResponseFormatter.error('Categoria cannot be its own parent', {
            status: 400,
            requestId: context.requestId,
          });
        }

        // Check if the new parent is not a descendant of this categoria
        const isDescendant = await this.isDescendant(categoriaData.parent_id, id);
        if (isDescendant) {
          return ResponseFormatter.error('Cannot set a descendant as parent (circular reference)', {
            status: 400,
            requestId: context.requestId,
          });
        }
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Add fields to update
      if (categoriaData.nome !== undefined) updateData.nome = categoriaData.nome;
      if (categoriaData.descricao !== undefined) updateData.descricao = categoriaData.descricao;
      if (categoriaData.parent_id !== undefined) updateData.parent_id = categoriaData.parent_id;
      if (categoriaData.ordem !== undefined) updateData.ordem = categoriaData.ordem;

      // Update categoria in database
      const { data: updatedCategoria, error } = await supabaseClient
        .from('categorias')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating categoria', {
          requestId: context.requestId,
          categoriaId: id,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error updating categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        updatedCategoria,
        {
          requestId: context.requestId,
          message: 'Categoria updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling partial update categoria request', {
        requestId: context.requestId,
        categoriaId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle removing a categoria
   */
  protected async handleRemove(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // TODO: Adapte para buscar o usuário autenticado do contexto, se necessário
      const user = undefined;
      if (!user || user.role !== 'admin') {
        return ResponseFormatter.forbiddenError('Only admins can delete categorias', context.requestId);
      }

      // Check if categoria exists
      const { data: existingCategoria, error: checkError } = await supabaseClient
        .from('categorias')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingCategoria) {
        return ResponseFormatter.notFoundError('Categoria not found', context.requestId);
      }

      // Check if categoria has children
      const { count: childrenCount, error: childrenError } = await supabaseClient
        .from('categorias')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', id);

      if (childrenError) {
        this.logger.error('Error checking for child categorias', {
          requestId: context.requestId,
          categoriaId: id,
          error: (typeof childrenError === 'object' && childrenError && 'message' in childrenError) ? (childrenError as { message: string }).message : String(childrenError),
        });

        return ResponseFormatter.error('Error checking for child categorias', {
          status: 500,
          requestId: context.requestId,
        });
      }

      if (childrenCount && childrenCount > 0) {
        return ResponseFormatter.error('Cannot delete categoria with children', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Delete categoria from database
      const { error } = await supabaseClient
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Error deleting categoria', {
          requestId: context.requestId,
          categoriaId: id,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error deleting categoria', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { deleted: true },
        {
          requestId: context.requestId,
          message: 'Categoria deleted successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling delete categoria request', {
        requestId: context.requestId,
        categoriaId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error deleting categoria', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Get hierarchical structure of categorias
   */
  private async getHierarchicalCategorias(requestId: string): Promise<unknown> {
    try {
      // Get all categorias
      const { data, error }: { data: unknown[]; error: unknown } = await supabaseClient
        .from('categorias')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) {
        this.logger.error('Error fetching categorias for hierarchy', {
          requestId,
          error: (typeof error === 'object' && error && 'message' in error) ? (error as { message: string }).message : String(error),
        });

        return ResponseFormatter.error('Error retrieving categorias', {
          status: 500,
          requestId,
        });
      }

      // Build hierarchy
      const categoriaMap = new Map<string, CategoriaComFilhos>();
      const rootCategorias: CategoriaComFilhos[] = [];

      // First pass: create map of all categorias
      data?.forEach(categoria => {
        if (typeof categoria === 'object' && categoria !== null && 'id' in categoria) {
          const cat = categoria as Categoria;
          categoriaMap.set(cat.id, { ...cat, children: [] });
        }
      });

      // Second pass: build hierarchy
      data?.forEach(categoria => {
        if (typeof categoria === 'object' && categoria !== null && 'id' in categoria) {
          const categoriaWithChildren = categoriaMap.get((categoria as { id: string }).id);
          const parentId = (categoria as { parent_id?: string }).parent_id;
          if (parentId && categoriaMap.has(parentId)) {
            // Add to parent's children
            const parent = categoriaMap.get(parentId);
            parent.children.push(categoriaWithChildren);
          } else {
            // Add to root categorias
            if (categoriaWithChildren) rootCategorias.push(categoriaWithChildren);
          }
        }
      });

      return ResponseFormatter.success(rootCategorias, { requestId });
    } catch (error) {
      this.logger.error('Error building categoria hierarchy', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving categoria hierarchy', {
        status: 500,
        requestId,
      });
    }
  }

  /**
   * Check if potentialDescendant is a descendant of ancestorId
   */
  private async isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    // Get the potential descendant
    const { data } = await supabaseClient
      .from('categorias')
      .select('parent_id')
      .eq('id', potentialDescendantId)
      .single();

    if (!data || !data.parent_id) {
      return false;
    }

    if (data.parent_id === ancestorId) {
      return true;
    }

    // Recursively check the parent
    return this.isDescendant(data.parent_id, ancestorId);
  }
}

// Create route handler
const categoriaRouteHandler = new CategoriaRouteHandler();
const routeHandlers = categoriaRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;