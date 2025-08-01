import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

// Define concurso interface
// interface Concurso {
//   [key: string]: unknown;
//   id: string;
//   nome: string;
//   organizador: string;
//   data_prova: string;
//   inscricoes_inicio: string;
//   inscricoes_fim: string;
//   status: 'ativo' | 'inativo' | 'encerrado' | 'cancelado';
//   descricao?: string;
//   edital_url?: string;
//   created_at: string;
//   updated_at: string;
// }

// Validation schemas
const createConcursoSchema = z.object({
  nome: z.string().min(3).max(200),
  organizador: z.string().min(2).max(100),
  data_prova: z.string().datetime(),
  inscricoes_inicio: z.string().datetime(),
  inscricoes_fim: z.string().datetime(),
  status: z.enum(['ativo', 'inativo', 'encerrado', 'cancelado']).default('ativo'),
  descricao: z.string().max(2000).optional(),
  edital_url: z.string().url().optional(),
});

const updateConcursoSchema = z.object({
  nome: z.string().min(3).max(200).optional(),
  organizador: z.string().min(2).max(100).optional(),
  data_prova: z.string().datetime().optional(),
  inscricoes_inicio: z.string().datetime().optional(),
  inscricoes_fim: z.string().datetime().optional(),
  status: z.enum(['ativo', 'inativo', 'encerrado', 'cancelado']).optional(),
  descricao: z.string().max(2000).optional(),
  edital_url: z.string().url().optional(),
});

const querySchema = z.object({
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

/**
 * GET /api/concursos - List concursos
 */
export const listConcursosHandler = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.format(),
      });
    }

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
    } = validationResult.data;

    // Start building the query
    let concursosQuery = supabase
      .from('concursos')
      .select('*');

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
    const { count, error: countError } = await supabase
      .from('concursos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      logger.error('Error counting concursos', {
        error: countError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concursos',
      });
    }

    // Apply pagination and sorting
    const { data, error } = await concursosQuery
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching concursos', {
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concursos',
      });
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error handling concurso list request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving concursos',
    });
  }
};

/**
 * GET /api/concursos/:id - Get concurso by ID
 */
export const getConcursoByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get concurso data
    const { data, error } = await supabase
      .from('concursos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', {
        concursoId: id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
      });
    }

    // Get related categories
    const { data: categorias } = await supabase
      .from('concurso_categorias')
      .select('*')
      .eq('concurso_id', id);

    // Return concurso with categories
    return res.json({
      success: true,
      data: {
        ...data,
        categorias: categorias || [],
      },
    });
  } catch (error) {
    logger.error('Error handling get concurso request', {
      concursoId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving concurso',
    });
  }
};

/**
 * POST /api/concursos - Create concurso
 */
export const createConcursoHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createConcursoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Create concurso in database
    const { data: newConcurso, error } = await supabase
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
      logger.error('Error creating concurso', {
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error creating concurso',
      });
    }

    return res.status(201).json({
      success: true,
      data: newConcurso,
      message: 'Concurso created successfully',
    });
  } catch (error) {
    logger.error('Error handling create concurso request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error creating concurso',
    });
  }
};

/**
 * PUT /api/concursos/:id - Update concurso
 */
export const updateConcursoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateConcursoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Check if concurso exists
    const { data: existingConcurso, error: checkError } = await supabase
      .from('concursos')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingConcurso) {
      return res.status(404).json({
        success: false,
        error: 'Concurso not found',
      });
    }

    // Update concurso in database
    const { data: updatedConcurso, error } = await supabase
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
      logger.error('Error updating concurso', {
        concursoId: id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error updating concurso',
      });
    }

    return res.json({
      success: true,
      data: updatedConcurso,
      message: 'Concurso updated successfully',
    });
  } catch (error) {
    logger.error('Error handling update concurso request', {
      concursoId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error updating concurso',
    });
  }
};

/**
 * PATCH /api/concursos/:id - Partial update concurso
 */
export const partialUpdateConcursoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateConcursoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Check if concurso exists
    const { data: existingConcurso, error: checkError } = await supabase
      .from('concursos')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingConcurso) {
      return res.status(404).json({
        success: false,
        error: 'Concurso not found',
      });
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
    const { data: updatedConcurso, error } = await supabase
      .from('concursos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating concurso', {
        concursoId: id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error updating concurso',
      });
    }

    return res.json({
      success: true,
      data: updatedConcurso,
      message: 'Concurso updated successfully',
    });
  } catch (error) {
    logger.error('Error handling partial update concurso request', {
      concursoId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error updating concurso',
    });
  }
};

/**
 * DELETE /api/concursos/:id - Delete concurso
 */
export const deleteConcursoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if concurso exists
    const { data: existingConcurso, error: checkError } = await supabase
      .from('concursos')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingConcurso) {
      return res.status(404).json({
        success: false,
        error: 'Concurso not found',
      });
    }

    // Delete related categories first
    await supabase
      .from('concurso_categorias')
      .delete()
      .eq('concurso_id', id);

    // Delete concurso from database
    const { error } = await supabase
      .from('concursos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting concurso', {
        concursoId: id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error deleting concurso',
      });
    }

    return res.json({
      success: true,
      data: { deleted: true },
      message: 'Concurso deleted successfully',
    });
  } catch (error) {
    logger.error('Error handling delete concurso request', {
      concursoId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error deleting concurso',
    });
  }
};