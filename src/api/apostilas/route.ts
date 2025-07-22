import express from 'express';
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase.js';
import { requestLogger } from '../../middleware/logger.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { getUserConcurso, checkConcursoAccess } from '../../utils/concurso-filter.js';
import { 
  validateApostilaFilters,
  validateApostilaId,
  validateCreateApostila,
  validateUpdateApostila,
  validateCreateApostilaContent,
  validateUpdateApostilaContent,
  validateApostilaContentId
} from '../../validation/apostilas.validation.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit); // 100 requests por 15 minutos

// =====================================================
// ROTAS PARA APOSTILAS
// =====================================================

// GET /api/apostilas - Listar apostilas com filtros e paginação
router.get('/', validateApostilaFilters, requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      categoria_id, 
      ativo, 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Obter o usuário autenticado
    const userId = (req as { user?: { id?: string } }).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
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
    const concursoId = await getUserConcurso(supabase, userId);
    if (concursoId) {
      query = query.eq('concurso_id', concursoId);
    }

    // Aplicar filtros adicionais
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    if (ativo !== undefined) {
      query = query.eq('ativo', ativo === 'true');
    }

    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Calcular offset para paginação
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Buscar dados com paginação
    const { data: apostilas, error: apostilasError, count } = await query
      .range(offset, offset + limitNum - 1)
      .order('criado_em', { ascending: false });

    if (apostilasError) {
      console.error('Erro ao buscar apostilas:', apostilasError);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar apostilas'
      });
      return;
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

    res.json({
      success: true,
      data: apostilas || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages
      }
    });

  } catch (error) {
    console.error('Erro ao processar requisição GET /api/apostilas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// GET /api/apostilas/:id - Buscar apostila por ID
router.get('/:id', validateApostilaId, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Obter o usuário autenticado
    const userId = (req as { user?: { id?: string } }).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    // Verificar se o usuário tem acesso a esta apostila
    const hasAccess = await checkConcursoAccess(supabase, userId, id, 'apostilas');
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado a esta apostila'
      });
      return;
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
        res.status(404).json({
          success: false,
          error: 'Apostila não encontrada'
        });
        return;
      }
      
      console.error('Erro ao buscar apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar apostila'
      });
      return;
    }

    res.json({
      success: true,
      data: apostila
    });

  } catch (error) {
    console.error('Erro ao processar requisição GET /api/apostilas/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// POST /api/apostilas - Criar nova apostila (requer autenticação)
router.post('/', requireAuth, validateCreateApostila, async (req: Request, res: Response) => {
  try {
    const apostilaData = req.body;

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
      console.error('Erro ao criar apostila:', error);
      
      if (error.code === '23505') {
        res.status(400).json({
          success: false, 
          error: 'Apostila já existe com esses dados'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno ao criar apostila'
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Apostila criada com sucesso',
      data: apostila
    });

  } catch (error) {
    console.error('Erro ao processar requisição POST /api/apostilas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// PUT /api/apostilas/:id - Atualizar apostila (requer autenticação)
router.put('/:id', requireAuth, validateApostilaId, validateUpdateApostila, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remover o ID dos dados de atualização
    delete updateData.id;

    const { data: apostila, error } = await supabase
      .from('apostilas')
      .update({
        ...updateData,
        atualizado_em: new Date().toISOString()
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
        res.status(404).json({
          success: false,
          error: 'Apostila não encontrada'
        });
        return;
      }
      
      console.error('Erro ao atualizar apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar apostila'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Apostila atualizada com sucesso',
      data: apostila
    });

  } catch (error) {
    console.error('Erro ao processar requisição PUT /api/apostilas/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// DELETE /api/apostilas/:id - Deletar apostila (requer admin)
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin
    const userId = (req as { user?: { id?: string; is_admin?: boolean } }).user?.id;
    if (!userId || !(req.user?.is_admin)) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado: usuário não é administrador'
      });
      return;
    }

    const { error } = await supabase
      .from('apostilas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao deletar apostila'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Apostila deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar requisição DELETE /api/apostilas/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// =====================================================
// ROTAS PARA CONTEÚDO DE APOSTILAS
// =====================================================

// GET /api/apostilas/:id/content - Listar conteúdo de uma apostila
router.get('/:id/content', validateApostilaId, async (req: Request, res: Response) => {
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
      console.error('Erro ao buscar conteúdo da apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar conteúdo da apostila'
      });
      return;
    }

    res.json({
      success: true,
      data: content || []
    });

  } catch (error) {
    console.error('Erro ao processar requisição GET /api/apostilas/:id/content:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// POST /api/apostilas/:id/content - Adicionar conteúdo à apostila (requer autenticação)
router.post('/:id/content', requireAuth, validateApostilaId, validateCreateApostilaContent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contentData = req.body;

    // Garantir que o apostila_id seja o da URL
    contentData.apostila_id = id;

    const { data: content, error } = await supabase
      .from('conteudo_apostila')
      .insert(contentData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conteúdo da apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao criar conteúdo da apostila'
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Conteúdo da apostila criado com sucesso',
      data: content
    });

  } catch (error) {
    console.error('Erro ao processar requisição POST /api/apostilas/:id/content:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// PUT /api/apostilas/content/:contentId - Atualizar conteúdo específico (requer autenticação)
router.put('/content/:id', requireAuth, validateApostilaContentId, validateUpdateApostilaContent, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remover o ID dos dados de atualização
    delete updateData.id;

    const { data: content, error } = await supabase
      .from('conteudo_apostila')
      .update({
        ...updateData,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Conteúdo da apostila não encontrado'
        });
        return;
      }
      
      console.error('Erro ao atualizar conteúdo da apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar conteúdo da apostila'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Conteúdo da apostila atualizado com sucesso',
      data: content
    });

  } catch (error) {
    console.error('Erro ao processar requisição PUT /api/apostilas/content/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

// DELETE /api/apostilas/content/:contentId - Deletar conteúdo específico (requer admin)
router.delete('/content/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin
    const userId = (req as { user?: { id?: string; is_admin?: boolean } }).user?.id;
    if (!userId || !(req.user?.is_admin)) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado: usuário não é administrador'
      });
      return;
    }

    const { error } = await supabase
      .from('conteudo_apostila')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar conteúdo da apostila:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao deletar conteúdo da apostila'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Conteúdo da apostila deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar requisição DELETE /api/apostilas/content/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor'
    });
  }
});

export default router;



