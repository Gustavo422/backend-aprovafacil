import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Interface para categoria de concurso
interface ConcursoCategoria {
  id: string;
  ordem: number;
  categoria: {
    id: string;
    nome: string;
    [key: string]: unknown;
  };
}

// Validation schemas
const addCategoriaSchema = z.object({
  categoria_id: z.string().uuid(),
  ordem: z.number().int().positive().optional(),
});

const updateCategoriaSchema = z.object({
  ordem: z.number().int().positive(),
});

/**
 * GET /api/concursos/categorias - Get categorias for a concurso
 */
export const getConcursoCategoriasHandler = async (req: Request, res: Response) => {
  try {
    // Get concurso ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/categorias
    
    if (!concursoId || concursoId === 'concursos') {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID is required',
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
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', {
        concursoId,
        error: concursoError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
      });
    }

    // Get categorias for concurso
    const { data, error } = await supabase
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
      logger.error('Error fetching concurso categorias', {
        concursoId,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso categorias',
      });
    }

    // Format response
    const formattedCategorias = (data ?? []).map((item: any) => ({
      id: item.id,
      ordem: item.ordem,
      categoria: item.categorias, // The Supabase query returns 'categorias' not 'categoria'
    }));

    return res.json({
      success: true,
      data: {
        concurso: {
          id: concurso.id,
          nome: concurso.nome,
        },
        categorias: formattedCategorias,
      },
    });
  } catch (error) {
    logger.error('Error handling get concurso categorias request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving concurso categorias',
    });
  }
};

/**
 * POST /api/concursos/categorias - Add categoria to concurso
 */
export const addConcursoCategoriaHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can add categorias to concursos',
      });
    }

    // Validate request body
    const validationResult = addCategoriaSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    // Get concurso ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/categorias
    
    if (!concursoId || concursoId === 'concursos') {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID is required',
      });
    }

    const data = validationResult.data;

    // Check if concurso exists
    const { error: concursoError } = await supabase
      .from('concursos')
      .select('id')
      .eq('id', concursoId)
      .single();

    if (concursoError) {
      if (concursoError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', {
        concursoId,
        error: concursoError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
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
        return res.status(400).json({
          success: false,
          error: 'Categoria not found',
        });
      }

      logger.error('Error fetching categoria', {
        categoriaId: data.categoria_id,
        error: categoriaError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving categoria',
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
      return res.status(409).json({
        success: false,
        error: 'Categoria already added to concurso',
        code: 'ALREADY_EXISTS',
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
      logger.error('Error adding categoria to concurso', {
        concursoId,
        categoriaId: data.categoria_id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error adding categoria to concurso',
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        id: newRelation.id,
        concurso_id: concursoId,
        categoria_id: data.categoria_id,
        categoria_nome: categoria.nome,
        ordem: newRelation.ordem,
      },
      message: 'Categoria added to concurso successfully',
    });
  } catch (error) {
    logger.error('Error handling add categoria to concurso request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error adding categoria to concurso',
    });
  }
};

/**
 * PUT /api/concursos/categorias/{categoriaId} - Update concurso categoria
 */
export const updateConcursoCategoriaHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update concurso categorias',
      });
    }

    // Validate request body
    const validationResult = updateCategoriaSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    // Get concurso ID and categoria ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 3]; // Assuming URL pattern is /concursos/{concursoId}/categorias/{categoriaId}
    const categoriaId = pathParts[pathParts.length - 1];
    
    if (!concursoId || concursoId === 'concursos' || !categoriaId || categoriaId === 'categorias') {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID and categoria ID are required',
      });
    }

    const data = validationResult.data;

    // Check if relation exists
    const { data: existingRelation, error: checkError } = await supabase
      .from('concurso_categorias')
      .select('id')
      .eq('concurso_id', concursoId)
      .eq('categoria_id', categoriaId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Categoria not found in concurso',
        });
      }

      logger.error('Error checking concurso categoria relation', {
        concursoId,
        categoriaId,
        error: checkError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error checking concurso categoria relation',
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
      logger.error('Error updating concurso categoria', {
        concursoId,
        categoriaId,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error updating concurso categoria',
      });
    }

    return res.json({
      success: true,
      data: updatedRelation,
      message: 'Concurso categoria updated successfully',
    });
  } catch (error) {
    logger.error('Error handling update concurso categoria request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error updating concurso categoria',
    });
  }
};

/**
 * DELETE /api/concursos/categorias/{categoriaId} - Remove categoria from concurso
 */
export const deleteConcursoCategoriaHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can remove categorias from concursos',
      });
    }

    // Get concurso ID and categoria ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 3]; // Assuming URL pattern is /concursos/{concursoId}/categorias/{categoriaId}
    const categoriaId = pathParts[pathParts.length - 1];
    
    if (!concursoId || concursoId === 'concursos' || !categoriaId || categoriaId === 'categorias') {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID and categoria ID are required',
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
        return res.status(404).json({
          success: false,
          error: 'Categoria not found in concurso',
        });
      }

      logger.error('Error checking concurso categoria relation', {
        concursoId,
        categoriaId,
        error: checkError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error checking concurso categoria relation',
      });
    }

    // Delete relation
    const { error } = await supabase
      .from('concurso_categorias')
      .delete()
      .eq('id', existingRelation.id);

    if (error) {
      logger.error('Error removing categoria from concurso', {
        concursoId,
        categoriaId,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error removing categoria from concurso',
      });
    }

    return res.json({
      success: true,
      data: { deleted: true },
      message: 'Categoria removed from concurso successfully',
    });
  } catch (error) {
    logger.error('Error handling remove categoria from concurso request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error removing categoria from concurso',
    });
  }
};