import type { Request, Response } from 'express';
import express from 'express';
import { supabase } from '../../config/supabase-unified.js';
import { requestLogger } from '../../middleware/logger.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// ========================================
// GET - Buscar categorias
// ========================================

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ativo, slug } = req.query;

    // Construir query base
    let query = supabase.from('categorias_concursos').select('*');

    // Aplicar filtros
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo === 'true');
    }

    if (slug) {
      query = query.eq('slug', slug);
    }

    // Executar query
    const { data: categorias, error } = await query.order('nome', { ascending: true });

    if (error) {
      logger.error('Erro ao buscar categorias de concurso:', { error: error.message, code: (error as unknown as { code?: string }).code, details: (error as unknown as { details?: unknown }).details });
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar categorias de concurso',
      });
      return;
    }

    res.json({
      success: true,
      data: categorias || [],
    });
  } catch (error) {
    logger.error('Erro ao processar requisição GET /api/concurso-categorias:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// ========================================
// POST - Criar categoria (apenas admin)
// ========================================

const createCategoriaHandler = async (req: Request, res: Response) => {
  try {
    const { nome, slug, descricao, cor_primaria, cor_secundaria } = req.body;

    // Validar dados obrigatórios
    if (!nome || !slug) {
      res.status(400).json({
        success: false,
        error: 'Nome e slug são obrigatórios',
      });
      return;
    }

    // Verificar se o slug já existe
    const { data: existingCategoria, error: existingError } = await supabase
      .from('categorias_concursos')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('Erro ao verificar slug existente:', { error: existingError.message, code: existingError.code, details: existingError.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar slug existente',
      });
      return;
    }

    if (existingCategoria) {
      res.status(409).json({
        success: false,
        error: 'Slug já existe',
      });
      return;
    }

    // Criar categoria
    const { data: categoria, error } = await supabase
      .from('categorias_concursos')
      .insert({
        nome,
        slug,
        descricao,
        cor_primaria: cor_primaria ?? '#2563EB',
        cor_secundaria: cor_secundaria ?? '#1E40AF',
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar categoria de concurso:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao criar categoria de concurso',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: categoria,
    });
  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/concurso-categorias:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

// ========================================
// PUT - Atualizar categoria
// ========================================

const updateCategoriaHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, slug, descricao, cor_primaria, cor_secundaria, ativo } = req.body;

    // Verificar se a categoria existe
    const { data: existingCategoria, error: existingError } = await supabase
      .from('categorias_concursos')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError || !existingCategoria) {
      res.status(404).json({
        success: false,
        error: 'Categoria não encontrada',
      });
      return;
    }

    // Se o slug foi alterado, verificar se já existe
    if (slug && slug !== existingCategoria.slug) {
      const { data: slugExists, error: slugError } = await supabase
        .from('categorias_concursos')
        .select('id')
        .eq('slug', slug)
        .single();

      if (slugError && slugError.code !== 'PGRST116') {
        logger.error('Erro ao verificar slug existente:', { error: slugError.message, code: slugError.code, details: slugError.details });
        res.status(500).json({
          success: false,
          error: 'Erro ao verificar slug existente',
        });
        return;
      }

      if (slugExists) {
        res.status(409).json({
          success: false,
          error: 'Slug já existe',
        });
        return;
      }
    }

    // Atualizar categoria
    const { data: categoria, error } = await supabase
      .from('categorias_concursos')
      .update({
        nome,
        slug,
        descricao,
        cor_primaria,
        cor_secundaria,
        ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar categoria de concurso:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar categoria de concurso',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Categoria atualizada com sucesso',
      data: categoria,
    });
  } catch (error) {
    logger.error('Erro ao processar requisição PUT /api/concurso-categorias/:id:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

// ========================================
// DELETE - Deletar categoria
// ========================================

const deleteCategoriaHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se a categoria existe
    const { data: existingCategoria, error: existingError } = await supabase
      .from('categorias_concursos')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existingCategoria) {
      res.status(404).json({
        success: false,
        error: 'Categoria não encontrada',
      });
      return;
    }

    // Deletar categoria
    const { error } = await supabase
      .from('categorias_concursos')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar categoria:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao deletar categoria',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Categoria deletada com sucesso',
    });
  } catch (error) {
    logger.error('Erro interno:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

// Registrar rotas
router.post('/', requireAuth, async (req, res) => await createCategoriaHandler(req, res));
router.put('/:id', requireAuth, async (req, res) => await updateCategoriaHandler(req, res));
router.delete('/:id', requireAuth, async (req, res) => await deleteCategoriaHandler(req, res));

export { router };
