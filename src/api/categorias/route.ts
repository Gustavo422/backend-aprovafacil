import type { Request, Response } from 'express';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';

// Validation schemas
const querySchema = z.object({
  ativo: z.string().optional().transform(val => val === 'true'),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

/**
 * GET /api/categorias - Listar categorias com filtros e paginação
 */
export const listCategoriasHandler = async (req: Request, res: Response) => {
  logger.info('Início da requisição GET /api/categorias', { query: req.query });

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
      ativo, 
      search, 
      page = 1, 
      limit = 20, 
    } = validationResult.data;

    let query = supabase
      .from('categorias')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `);

    // Aplicar filtros
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Calcular offset para paginação
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Buscar dados com paginação
    logger.debug('Executando query para categorias', { filters: { ativo, search, page, limit }, offset });
    const { data: categorias, error: categoriasError, count } = await query
      .range(offset, offset + limitNum - 1)
      .order('nome', { ascending: true });

    if (categoriasError) {
      logger.error('Erro ao executar query Supabase para categorias', { error: categoriasError });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar categorias',
      });
    }

    // Buscar total de registros para paginação
    let totalCount = 0;
    if (count === null) {
      const { count: total } = await supabase
        .from('categorias')
        .select('*', { count: 'exact', head: true });
      totalCount = total || 0;
    } else {
      totalCount = count;
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Resposta de categorias preparada', { totalCount, page: pageNum, resultsCount: categorias?.length || 0 });
    return res.json({
      success: true,
      data: categorias || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
      },
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/categorias', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * GET /api/categorias/:id - Buscar categoria por ID
 */
export const getCategoriaByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: categoria, error } = await supabase
      .from('categorias')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Categoria não encontrada',
        });
      }
      
      logger.error('Erro ao buscar categoria por ID', { error, id });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar categoria',
      });
    }

    return res.json({
      success: true,
      data: categoria,
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/categorias/:id', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
}; 