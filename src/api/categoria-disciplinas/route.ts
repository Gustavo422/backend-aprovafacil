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
// GET - Buscar disciplinas
// ========================================

router.get('/', async (req: Request, res: Response) => {
    try {
        const { categoria_id, is_active } = req.query;

        // Construir query base
        let query = supabase.from('categoria_disciplinas').select('*');

        // Aplicar filtros
        if (categoria_id) {
            query = query.eq('categoria_id', categoria_id);
        }

        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        // Executar query
        const { data: disciplinas, error } = await query.order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao buscar disciplinas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar disciplinas'
            });
            return;
        }

        res.json({
            success: true,
            data: disciplinas || []
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
// POST - Criar disciplina (apenas admin)
// ========================================

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { categoria_id, nome, peso, horas_semanais, ordem } = req.body;

        // Validar dados obrigatórios
        if (!categoria_id || !nome || !peso || !horas_semanais || !ordem) {
            res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
            return;
        }

        // Validar peso (1-100)
        if (peso < 1 || peso > 100) {
            res.status(400).json({
                success: false,
                error: 'Peso deve estar entre 1 e 100'
            });
            return;
        }

        // Validar horas semanais
        if (horas_semanais < 1) {
            res.status(400).json({
                success: false,
                error: 'Horas semanais deve ser maior que 0'
            });
            return;
        }

        // Verificar se a categoria existe
        const { data: categoria, error: categoriaError } = await supabase
            .from('concurso_categorias')
            .select('id')
            .eq('id', categoria_id)
            .eq('is_active', true)
            .single();

        if (categoriaError || !categoria) {
            res.status(404).json({
                success: false,
                error: 'Categoria não encontrada ou inativa'
            });
            return;
        }

        // Verificar se já existe disciplina com o mesmo nome na categoria
        const { data: existingDisciplina, error: existingError } = await supabase
            .from('categoria_disciplinas')
            .select('id')
            .eq('categoria_id', categoria_id)
            .eq('nome', nome)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Erro ao verificar disciplina existente:', existingError);
            res.status(500).json({
                success: false,
                error: 'Erro ao verificar disciplina existente'
            });
            return;
        }

        if (existingDisciplina) {
            res.status(409).json({
                success: false,
                error: 'Disciplina já existe nesta categoria'
            });
            return;
        }

        // Criar disciplina
        const { data: disciplina, error } = await supabase
            .from('categoria_disciplinas')
            .insert({
                categoria_id,
                nome,
                peso,
                horas_semanais,
                ordem,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar disciplina:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao criar disciplina'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Disciplina criada com sucesso',
            data: disciplina
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
// PUT - Atualizar disciplina
// ========================================

router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { categoria_id, nome, peso, horas_semanais, ordem, is_active } = req.body;

        // Verificar se a disciplina existe
        const { data: existingDisciplina, error: existingError } = await supabase
            .from('categoria_disciplinas')
            .select('*')
            .eq('id', id)
            .single();

        if (existingError || !existingDisciplina) {
            res.status(404).json({
                success: false,
                error: 'Disciplina não encontrada'
            });
            return;
        }

        // Validar dados se fornecidos
        if (peso !== undefined && (peso < 1 || peso > 100)) {
            res.status(400).json({
                success: false,
                error: 'Peso deve estar entre 1 e 100'
            });
            return;
        }

        if (horas_semanais !== undefined && horas_semanais < 1) {
            res.status(400).json({
                success: false,
                error: 'Horas semanais deve ser maior que 0'
            });
            return;
        }

        // Atualizar disciplina
        const { data: disciplina, error } = await supabase
            .from('categoria_disciplinas')
            .update({
                categoria_id,
                nome,
                peso,
                horas_semanais,
                ordem,
                is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar disciplina:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar disciplina'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Disciplina atualizada com sucesso',
            data: disciplina
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
// DELETE - Deletar disciplina
// ========================================

router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar se a disciplina existe
        const { data: existingDisciplina, error: existingError } = await supabase
            .from('categoria_disciplinas')
            .select('id')
            .eq('id', id)
            .single();

        if (existingError || !existingDisciplina) {
            res.status(404).json({
                success: false,
                error: 'Disciplina não encontrada'
            });
            return;
        }

        // Deletar disciplina
        const { error } = await supabase
            .from('categoria_disciplinas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar disciplina:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao deletar disciplina'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Disciplina deletada com sucesso'
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
