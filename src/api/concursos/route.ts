import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// Validation schemas
const createConcursoSchema = z.object({
  nome: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  descricao: z.string().max(2000).optional(),
  ano: z.number().int().min(2000).max(2030),
  banca: z.string().min(2).max(100),
  categoria_id: z.string().uuid().optional(),
  url_edital: z.string().url().optional(),
  data_prova: z.string().optional(),
  vagas: z.number().int().min(0).optional(),
  salario: z.number().min(0).optional(),
  nivel_dificuldade: z.enum(['facil', 'medio', 'dificil']).default('medio'),
  multiplicador_questoes: z.number().min(0.1).max(2.0).default(1.0),
  ativo: z.boolean().default(true),
});

const updateConcursoSchema = z.object({
  nome: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(200).optional(),
  descricao: z.string().max(2000).optional(),
  ano: z.number().int().min(2000).max(2030).optional(),
  banca: z.string().min(2).max(100).optional(),
  categoria_id: z.string().uuid().optional(),
  url_edital: z.string().url().optional(),
  data_prova: z.string().optional(),
  vagas: z.number().int().min(0).optional(),
  salario: z.number().min(0).optional(),
  nivel_dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  multiplicador_questoes: z.number().min(0.1).max(2.0).optional(),
  ativo: z.boolean().optional(),
});

/**
 * GET /api/concursos - List concursos with pagination and filters
 */
export const getConcursosHandler = async (req: Request, res: Response) => {
  try {
    logger.info('Início da requisição GET /api/concursos', { 
      component: 'backend', 
      query: req.query,
      url: req.url, 
    });

    const {
      page = 1,
      limit = 10,
      sort = 'criado_em',
      order = 'desc',
      ativo,
      search,
      categoria_id,
      ano,
      banca,
    } = req.query as {
      page?: string;
      limit?: string;
      sort?: string;
      order?: 'asc' | 'desc';
      ativo?: string;
      search?: string;
      categoria_id?: string;
      ano?: string;
      banca?: string;
    };

    // Start building the query
    let concursosQuery = supabase
      .from('concursos')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `);

    // Apply filters
    if (ativo !== undefined) {
      concursosQuery = concursosQuery.eq('ativo', ativo === 'true');
    }

    if (search) {
      concursosQuery = concursosQuery.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    if (categoria_id) {
      concursosQuery = concursosQuery.eq('categoria_id', categoria_id);
    }

    if (ano) {
      concursosQuery = concursosQuery.eq('ano', parseInt(ano, 10));
    }

    if (banca) {
      concursosQuery = concursosQuery.eq('banca', banca);
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('concursos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      logger.error('Error counting concursos', { error: countError.message });
      return res.status(500).json({
        success: false,
        error: 'Error retrieving concursos',
      });
    }

    // Apply pagination and sorting
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const { data, error } = await concursosQuery
      .order(sort, { ascending: order === 'asc' })
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

    if (error) {
      logger.error('Error fetching concursos', { 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint, 
      });
      return res.status(500).json({
        success: false,
        error: 'Error retrieving concursos',
        details: error.message,
      });
    }

    // Format concursos with categories
    const formattedConcursos = (Array.isArray(data) ? data : []).map((concurso: Record<string, unknown>) => {
      const { categorias_concursos, ...concursoData } = concurso;
      return {
        ...concursoData,
        categoria: categorias_concursos,
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil((count ?? 0) / limitNum);

    logger.info('Resposta de concursos preparada', { 
      component: 'backend', 
      totalCount: count ?? 0, 
      page: pageNum, 
      resultsCount: formattedConcursos.length, 
    });

    return res.json({
      success: true,
      data: formattedConcursos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count ?? 0,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error in getConcursosHandler', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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

    // Get concurso data with category
    const { data, error } = await supabase
      .from('concursos')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', { concursoId: id, error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
      });
    }

    // Format response
    const { categorias_concursos, ...concursoData } = data;
    const formattedConcurso = {
      ...concursoData,
      categoria: categorias_concursos,
    };

    return res.json({
      success: true,
      data: formattedConcurso,
    });
  } catch (error) {
    logger.error('Error in getConcursoByIdHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error retrieving concurso',
    });
  }
};

/**
 * POST /api/concursos - Create new concurso
 */
export const createConcursoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create concursos',
      });
    }

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
        slug: data.slug,
        descricao: data.descricao,
        ano: data.ano,
        banca: data.banca,
        categoria_id: data.categoria_id,
        url_edital: data.url_edital,
        data_prova: data.data_prova,
        vagas: data.vagas,
        salario: data.salario,
        nivel_dificuldade: data.nivel_dificuldade,
        multiplicador_questoes: data.multiplicador_questoes,
        ativo: data.ativo,
      })
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating concurso', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Error creating concurso',
      });
    }

    // Format response
    const { categorias_concursos, ...concursoData } = newConcurso;
    const formattedConcurso = {
      ...concursoData,
      categoria: categorias_concursos,
    };

    return res.status(201).json({
      success: true,
      data: formattedConcurso,
      message: 'Concurso created successfully',
    });
  } catch (error) {
    logger.error('Error in createConcursoHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error creating concurso',
    });
  }
};

/**
 * PUT /api/concursos/:id - Update concurso (full update)
 */
export const updateConcursoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update concursos',
      });
    }

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
        slug: data.slug,
        descricao: data.descricao,
        ano: data.ano,
        banca: data.banca,
        categoria_id: data.categoria_id,
        url_edital: data.url_edital,
        data_prova: data.data_prova,
        vagas: data.vagas,
        salario: data.salario,
        nivel_dificuldade: data.nivel_dificuldade,
        multiplicador_questoes: data.multiplicador_questoes,
        ativo: data.ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating concurso', { concursoId: id, error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Error updating concurso',
      });
    }

    // Format response
    const { categorias_concursos, ...concursoData } = updatedConcurso;
    const formattedConcurso = {
      ...concursoData,
      categoria: categorias_concursos,
    };

    return res.json({
      success: true,
      data: formattedConcurso,
      message: 'Concurso updated successfully',
    });
  } catch (error) {
    logger.error('Error in updateConcursoHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error updating concurso',
    });
  }
};

/**
 * PATCH /api/concursos/:id - Update concurso (partial update)
 */
export const patchConcursoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update concursos',
      });
    }

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
      atualizado_em: new Date().toISOString(),
    };

    // Add fields to update
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.ano !== undefined) updateData.ano = data.ano;
    if (data.banca !== undefined) updateData.banca = data.banca;
    if (data.categoria_id !== undefined) updateData.categoria_id = data.categoria_id;
    if (data.url_edital !== undefined) updateData.url_edital = data.url_edital;
    if (data.data_prova !== undefined) updateData.data_prova = data.data_prova;
    if (data.vagas !== undefined) updateData.vagas = data.vagas;
    if (data.salario !== undefined) updateData.salario = data.salario;
    if (data.nivel_dificuldade !== undefined) updateData.nivel_dificuldade = data.nivel_dificuldade;
    if (data.multiplicador_questoes !== undefined) updateData.multiplicador_questoes = data.multiplicador_questoes;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    // Update concurso in database
    const { data: updatedConcurso, error } = await supabase
      .from('concursos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating concurso', { concursoId: id, error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Error updating concurso',
      });
    }

    // Format response
    const { categorias_concursos, ...concursoData } = updatedConcurso;
    const formattedConcurso = {
      ...concursoData,
      categoria: categorias_concursos,
    };

    return res.json({
      success: true,
      data: formattedConcurso,
      message: 'Concurso updated successfully',
    });
  } catch (error) {
    logger.error('Error in patchConcursoHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error updating concurso',
    });
  }
};

/**
 * DELETE /api/concursos/:id - Delete concurso
 */
export const deleteConcursoHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user has admin role
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete concursos',
      });
    }

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

    // Delete concurso from database
    const { error } = await supabase
      .from('concursos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting concurso', { concursoId: id, error: error.message });
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
    logger.error('Error in deleteConcursoHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error deleting concurso',
    });
  }
};

// Criar router Express
import { Router } from 'express';

const createRouter = () => Router();
const router = createRouter();

// Registrar rotas
router.get('/', async (req, res) => await getConcursosHandler(req, res));
router.get('/:id', async (req, res) => await getConcursoByIdHandler(req, res));
router.post('/', async (req, res) => await createConcursoHandler(req as AuthenticatedRequest, res));
router.put('/:id', async (req, res) => await updateConcursoHandler(req as AuthenticatedRequest, res));
router.patch('/:id', async (req, res) => await patchConcursoHandler(req as AuthenticatedRequest, res));
router.delete('/:id', async (req, res) => await deleteConcursoHandler(req as AuthenticatedRequest, res));

export { router };
