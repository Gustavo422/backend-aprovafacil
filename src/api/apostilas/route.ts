import { Request, Response } from 'express';
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
import { getUserConcurso, checkConcursoAccess } from '../../utils/concurso-filter.js';

// Validation schemas
const createApostilaSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  categoria_id: z.string().uuid(),
  concurso_id: z.string().uuid(),
  ativo: z.boolean().default(true),
  ordem: z.number().min(0).default(0),
});

const updateApostilaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().min(0).optional(),
});

const querySchema = z.object({
  categoria_id: z.string().uuid().optional(),
  ativo: z.string().optional().transform(val => val === 'true'),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

const createApostilaContentSchema = z.object({
  titulo: z.string().min(1),
  conteudo: z.string().min(1),
  tipo: z.enum(['texto', 'video', 'pdf', 'link']),
  ordem: z.number().min(0).default(0),
  module_number: z.number().min(1).default(1),
  ativo: z.boolean().default(true),
});

const updateApostilaContentSchema = z.object({
  titulo: z.string().min(1).optional(),
  conteudo: z.string().min(1).optional(),
  tipo: z.enum(['texto', 'video', 'pdf', 'link']).optional(),
  ordem: z.number().min(0).optional(),
  module_number: z.number().min(1).optional(),
  ativo: z.boolean().optional(),
});

/**
 * GET /api/apostilas - Listar apostilas com filtros e paginação
 */
export const listApostilasHandler = async (req: AuthenticatedRequest, res: Response) => {
  logger.info('Início da requisição GET /api/apostilas', { query: req.query, user: req.user?.id });

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
      categoria_id, 
      ativo, 
      search, 
      page = 1, 
      limit = 20, 
    } = validationResult.data;

    // Obter o usuário autenticado
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    let query = supabase
      .from('apostilas')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `);

    // Aplicar filtro automático por concurso do usuário
    const concursoId = await getUserConcurso(supabase, usuarioId);
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
      logger.debug('Filtro por concurso do usuário aplicado', { concursoId });
    }

    // Aplicar filtros adicionais
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }

    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Calcular offset para paginação
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Buscar dados com paginação
    logger.debug('Executando query para apostilas', { filters: { categoria_id, ativo, search, page, limit }, offset });
    const { data: apostilas, error: apostilasError, count } = await query
      .range(offset, offset + limitNum - 1)
      .order('criado_em', { ascending: false });

    if (apostilasError) {
      logger.error('Erro ao executar query Supabase para apostilas', { error: apostilasError, details: apostilasError.details, hint: apostilasError.hint, filters: { categoria_id, ativo, search, page, limit } });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar apostilas',
      });
    }

    // Buscar total de registros para paginação
    let totalCount = 0;
    if (count === null) {
      const { count: total } = await supabase
        .from('apostilas')
        .select('*', { count: 'exact', head: true });
      totalCount = total || 0;
    } else {
      totalCount = count;
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Resposta de apostilas preparada', { totalCount, page: pageNum, resultsCount: apostilas?.length || 0 });
    return res.json({
      success: true,
      data: apostilas || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
      },
    });

  } catch (error) {
    logger.error('Erro inesperado no endpoint GET /api/apostilas', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * GET /api/apostilas/:id - Buscar apostila por ID
 */
export const getApostilaByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Obter o usuário autenticado
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Verificar se o usuário tem acesso a esta apostila
    const hasAccess = await checkConcursoAccess(supabase, usuarioId, id, 'apostilas');
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado a esta apostila',
      });
    }

    const { data: apostila, error } = await supabase
      .from('apostilas')
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
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
          error: 'Apostila não encontrada',
        });
      }
      
      logger.error('Erro ao buscar apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar apostila',
      });
    }

    return res.json({
      success: true,
      data: apostila,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição GET /api/apostilas/:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * POST /api/apostilas - Criar nova apostila
 */
export const createApostilaHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createApostilaSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const apostilaData = validationResult.data;

    const { data: apostila, error } = await supabase
      .from('apostilas')
      .insert(apostilaData)
      .select(`
        *,
        categorias_concursos (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        ),
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .single();

    if (error) {
      logger.error('Erro ao criar apostila:', { error: error.message, code: error.code, details: error.details });
      
      if (error.code === '23505') {
        return res.status(400).json({
          success: false, 
          error: 'Apostila já existe com esses dados',
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao criar apostila',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Apostila criada com sucesso',
      data: apostila,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/apostilas:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * PUT /api/apostilas/:id - Atualizar apostila
 */
export const updateApostilaHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateApostilaSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const updateData = validationResult.data;

    // Remover o ID dos dados de atualização
    delete (updateData as Record<string, unknown>).id;

    const { data: apostila, error } = await supabase
      .from('apostilas')
      .update({
        ...updateData,
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
        ),
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Apostila não encontrada',
        });
      }
      
      logger.error('Erro ao atualizar apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar apostila',
      });
    }

    return res.json({
      success: true,
      message: 'Apostila atualizada com sucesso',
      data: apostila,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição PUT /api/apostilas/:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * DELETE /api/apostilas/:id - Deletar apostila
 */
export const deleteApostilaHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin
    const usuarioId = req.user?.id;
    if (!usuarioId || !(req.user?.is_admin)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: usuário não é administrador',
      });
    }

    const { error } = await supabase
      .from('apostilas')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao deletar apostila',
      });
    }

    return res.json({
      success: true,
      message: 'Apostila deletada com sucesso',
    });

  } catch (error) {
    logger.error('Erro ao processar requisição DELETE /api/apostilas/:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * GET /api/apostilas/:id/content - Listar conteúdo de uma apostila
 */
export const getApostilaContentHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: content, error } = await supabase
      .from('conteudo_apostila')
      .select('*')
      .eq('apostila_id', id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('module_number', { ascending: true });

    if (error) {
      logger.error('Erro ao buscar conteúdo da apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar conteúdo da apostila',
      });
    }

    return res.json({
      success: true,
      data: content || [],
    });

  } catch (error) {
    logger.error('Erro ao processar requisição GET /api/apostilas/:id/content:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * POST /api/apostilas/:id/content - Adicionar conteúdo à apostila
 */
export const createApostilaContentHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = createApostilaContentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const contentData = {
      ...validationResult.data,
      apostila_id: id,
    };

    const { data: content, error } = await supabase
      .from('conteudo_apostila')
      .insert(contentData)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar conteúdo da apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao criar conteúdo da apostila',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Conteúdo da apostila criado com sucesso',
      data: content,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/apostilas/:id/content:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * PUT /api/apostilas/content/:contentId - Atualizar conteúdo específico
 */
export const updateApostilaContentHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateApostilaContentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const updateData = validationResult.data;

    // Remover o ID dos dados de atualização
    delete (updateData as Record<string, unknown>).id;

    const { data: content, error } = await supabase
      .from('conteudo_apostila')
      .update({
        ...updateData,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Conteúdo da apostila não encontrado',
        });
      }
      
      logger.error('Erro ao atualizar conteúdo da apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar conteúdo da apostila',
      });
    }

    return res.json({
      success: true,
      message: 'Conteúdo da apostila atualizado com sucesso',
      data: content,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição PUT /api/apostilas/content/:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

/**
 * DELETE /api/apostilas/content/:contentId - Deletar conteúdo específico
 */
export const deleteApostilaContentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin
    const usuarioId = req.user?.id;
    if (!usuarioId || !(req.user?.is_admin)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: usuário não é administrador',
      });
    }

    const { error } = await supabase
      .from('conteudo_apostila')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar conteúdo da apostila:', { error: error.message, code: error.code, details: error.details });
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao deletar conteúdo da apostila',
      });
    }

    return res.json({
      success: true,
      message: 'Conteúdo da apostila deletado com sucesso',
    });

  } catch (error) {
    logger.error('Erro ao processar requisição DELETE /api/apostilas/content/:id:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor',
    });
  }
};

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas
router.get('/', listApostilasHandler);
router.get('/:id', getApostilaByIdHandler);
router.post('/', createApostilaHandler);
router.put('/:id', updateApostilaHandler);
router.delete('/:id', deleteApostilaHandler);

// Rotas de conteúdo
router.get('/:id/content', getApostilaContentHandler);
router.post('/:id/content', createApostilaContentHandler);
router.put('/content/:id', updateApostilaContentHandler);
router.delete('/content/:id', deleteApostilaContentHandler);

export { router };



