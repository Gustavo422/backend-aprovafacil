import express, { Request, Response } from 'express';
import { supabase } from '../../config/supabase.js';
import { requestLogger } from '../../middleware/logger.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// ========================================
// GET - Buscar categorias
// ========================================

router.get('/', async (req: Request, res: Response) => {
    try {
        const { is_active, slug } = req.query;

        // Construir query base
        let query = supabase.from('concurso_categorias').select('*');

        // Aplicar filtros
        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        if (slug) {
            query = query.eq('slug', slug);
        }

        // Executar query
        const { data: categorias, error } = await query.order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar categorias'
            });
            return;
        }

        res.json({
            success: true,
            data: categorias || []
        });
    } catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// ========================================
// POST - Criar categoria (apenas admin)
// ========================================

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { nome, slug, descricao, cor_primaria, cor_secundaria } = req.body;

        // Validar dados obrigatórios
        if (!nome || !slug) {
            res.status(400).json({
                success: false,
                error: 'Nome e slug são obrigatórios'
            });
            return;
        }

        // Verificar se o slug já existe
        const { data: existingCategoria, error: existingError } = await supabase
            .from('concurso_categorias')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Erro ao verificar slug existente:', existingError);
            res.status(500).json({
                success: false,
                error: 'Erro ao verificar slug existente'
            });
            return;
        }

        if (existingCategoria) {
            res.status(409).json({
                success: false,
                error: 'Slug já existe'
            });
            return;
        }

        // Criar categoria
        const { data: categoria, error } = await supabase
            .from('concurso_categorias')
            .insert({
                nome,
                slug,
                descricao,
                cor_primaria: cor_primaria || '#2563EB',
                cor_secundaria: cor_secundaria || '#1E40AF',
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao criar categoria'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Categoria criada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// ========================================
// PUT - Atualizar categoria
// ========================================

router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nome, slug, descricao, cor_primaria, cor_secundaria, is_active } = req.body;

        // Verificar se a categoria existe
        const { data: existingCategoria, error: existingError } = await supabase
            .from('concurso_categorias')
            .select('*')
            .eq('id', id)
            .single();

        if (existingError || !existingCategoria) {
            res.status(404).json({
                success: false,
                error: 'Categoria não encontrada'
            });
            return;
        }

        // Se o slug foi alterado, verificar se já existe
        if (slug && slug !== existingCategoria.slug) {
            const { data: slugExists, error: slugError } = await supabase
                .from('concurso_categorias')
                .select('id')
                .eq('slug', slug)
                .single();

            if (slugError && slugError.code !== 'PGRST116') {
                console.error('Erro ao verificar slug existente:', slugError);
                res.status(500).json({
                    success: false,
                    error: 'Erro ao verificar slug existente'
                });
                return;
            }

            if (slugExists) {
                res.status(409).json({
                    success: false,
                    error: 'Slug já existe'
                });
                return;
            }
        }

        // Atualizar categoria
        const { data: categoria, error } = await supabase
            .from('concurso_categorias')
            .update({
                nome,
                slug,
                descricao,
                cor_primaria,
                cor_secundaria,
                is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar categoria'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Categoria atualizada com sucesso',
            data: categoria
        });
    } catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// ========================================
// DELETE - Deletar categoria
// ========================================

router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar se a categoria existe
        const { data: existingCategoria, error: existingError } = await supabase
            .from('concurso_categorias')
            .select('id')
            .eq('id', id)
            .single();

        if (existingError || !existingCategoria) {
            res.status(404).json({
                success: false,
                error: 'Categoria não encontrada'
            });
            return;
        }

        // Deletar categoria
        const { error } = await supabase
            .from('concurso_categorias')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar categoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao deletar categoria'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Categoria deletada com sucesso'
        });
    } catch (error) {
        console.error('Erro interno:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

export default router;
