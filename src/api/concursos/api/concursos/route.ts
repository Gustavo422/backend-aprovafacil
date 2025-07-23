import express from 'express';
import { supabase } from '../../config/supabase.js';
import { requestLogger } from '../../../../middleware/logger.js';
import { rateLimit } from '../../../../middleware/rateLimit.js';
import { requireAuth } from '../../../../middleware/auth.js';
import { validateCreateConcurso, validateUpdateConcurso, validateConcursoFilters, validateConcursoId } from '../../validation/concursos.validation.js';
import { logger } from '../../../../utils/logger.js';
const router = express.Router();
// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit); // 100 requests por 15 minutos
// GET /api/concursos - Listar concursos com filtros e paginação
router.get('/', validateConcursoFilters, async (req, res) => {
    logger.info('Início da requisição GET /api/concursos', { query: req.query });
    try {
        const { categoria_id, ano, banca, ativo, search, page = 1, limit = 20 } = req.query;
        let query = supabase
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
        // Aplicar filtros
        if (categoria_id) {
            query = query.eq('categoria_id', categoria_id);
        }
        if (ano) {
            query = query.eq('ano', ano);
        }
        if (banca) {
            query = query.ilike('banca', `%${banca}%`);
        }
        if (ativo !== undefined) {
            query = query.eq('ativo', ativo === 'true');
        }
        if (search) {
            query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
        }
        // Calcular offset para paginação
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const offset = (pageNum - 1) * limitNum;
        logger.debug('Executando query para concursos', { filters: { categoria_id, ano, banca, ativo, search }, offset, limit: limitNum });
        // Buscar dados com paginação
        const { data: concursos, error: concursosError, count } = await query
            .range(offset, offset + limitNum - 1)
            .order('criado_em', { ascending: false });
        if (concursosError) {
            logger.error('Erro ao executar query Supabase para concursos', { error: concursosError, details: concursosError.details, hint: concursosError.hint, filters: { categoria_id, ano, banca, ativo, search } });
            console.error('Erro ao buscar concursos:', concursosError);
            res.status(500).json({
                success: false,
                error: 'Erro interno ao buscar concursos'
            });
            return;
        }
        // Buscar total de registros para paginação
        let totalCount = 0;
        if (count === null) {
            const { count: total } = await supabase
                .from('concursos')
                .select('*', { count: 'exact', head: true });
            totalCount = total || 0;
        }
        else {
            totalCount = count;
        }
        const totalPages = Math.ceil(totalCount / limitNum);
        logger.info('Resposta de concursos preparada', { totalCount, page: pageNum, resultsCount: concursos?.length || 0 });
        res.json({
            success: true,
            data: concursos || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages
            }
        });
    }
    catch (error) {
        logger.error('Erro inesperado no endpoint GET /api/concursos', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
        console.error('Erro ao processar requisição GET /api/concursos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
// GET /api/concursos/:id - Buscar concurso por ID
router.get('/:id', validateConcursoId, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: concurso, error } = await supabase
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
                res.status(404).json({
                    success: false,
                    error: 'Concurso não encontrado'
                });
                return;
            }
            console.error('Erro ao buscar concurso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno ao buscar concurso'
            });
            return;
        }
        res.json({
            success: true,
            data: concurso
        });
    }
    catch (error) {
        console.error('Erro ao processar requisição GET /api/concursos/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
// POST /api/concursos - Criar novo concurso (requer autenticação)
router.post('/', requireAuth, validateCreateConcurso, async (req, res) => {
    try {
        const concursoData = req.body;
        const { data: concurso, error } = await supabase
            .from('concursos')
            .insert(concursoData)
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
            console.error('Erro ao criar concurso:', error);
            if (error.code === '23505') {
                res.status(400).json({
                    success: false,
                    error: 'Concurso já existe com esses dados'
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Erro interno ao criar concurso'
            });
            return;
        }
        res.status(201).json({
            success: true,
            message: 'Concurso criado com sucesso',
            data: concurso
        });
    }
    catch (error) {
        console.error('Erro ao processar requisição POST /api/concursos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
// PUT /api/concursos/:id - Atualizar concurso (requer autenticação)
router.put('/:id', requireAuth, validateConcursoId, validateUpdateConcurso, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Remover o ID dos dados de atualização
        delete updateData.id;
        const { data: concurso, error } = await supabase
            .from('concursos')
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
        )
      `)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({
                    success: false,
                    error: 'Concurso não encontrado'
                });
                return;
            }
            console.error('Erro ao atualizar concurso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno ao atualizar concurso'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Concurso atualizado com sucesso',
            data: concurso
        });
    }
    catch (error) {
        console.error('Erro ao processar requisição PUT /api/concursos/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
// DELETE /api/concursos/:id - Deletar concurso (requer admin)
router.delete('/:id', requireAuth, validateConcursoId, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('concursos')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Erro ao deletar concurso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno ao deletar concurso'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Concurso deletado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao processar requisição DELETE /api/concursos/:id:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
// PATCH /api/concursos/:id/activate - Ativar/desativar concurso (requer autenticação)
router.patch('/:id/activate', requireAuth, validateConcursoId, async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;
        if (typeof ativo !== 'boolean') {
            res.status(400).json({
                success: false,
                error: 'Campo ativo deve ser um boolean'
            });
            return;
        }
        const { data: concurso, error } = await supabase
            .from('concursos')
            .update({
            ativo,
            atualizado_em: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({
                    success: false,
                    error: 'Concurso não encontrado'
                });
                return;
            }
            console.error('Erro ao ativar/desativar concurso:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno ao atualizar status do concurso'
            });
            return;
        }
        res.json({
            success: true,
            message: `Concurso ${ativo ? 'ativado' : 'desativado'} com sucesso`,
            data: concurso
        });
    }
    catch (error) {
        console.error('Erro ao processar requisição PATCH /api/concursos/:id/activate:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno no servidor'
        });
    }
});
export default router;



