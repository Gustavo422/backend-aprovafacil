import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// GET - Buscar conteúdo filtrado
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        // Parâmetros obrigatórios
        const { categoria_id, concurso_id } = req.query;
        
        // Parâmetros opcionais
        const disciplina = req.query['disciplina'] as string;
        const dificuldade = req.query['dificuldade'] as string;
        const isPublic = req.query['is_public'] as string;
        const page = parseInt(req.query['page'] as string || '1');
        const limit = parseInt(req.query['limit'] as string || '20');

        // Validar parâmetros obrigatórios
        if (!categoria_id || !concurso_id) {
            res.status(400).json({
                success: false,
                error: 'categoria_id e concurso_id são obrigatórios'
            });
            return;
        }

        // Calcular offset para paginação
        const offset = (page - 1) * limit;

        // ========================================
        // BUSCAR SIMULADOS
        // ========================================

        let simuladosQuery = supabase
            .from('simulados_personalizados')
            .select(`
                *,
                concursos (
                    *,
                    concurso_categorias (*)
                )
            `)
            .eq('categoria_id', categoria_id)
            .eq('concurso_id', concurso_id)
            .is('deleted_at', null);

        if (isPublic !== undefined) {
            simuladosQuery = simuladosQuery.eq('is_public', isPublic === 'true');
        }

        const { data: simulados, error: simuladosError } = await simuladosQuery
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (simuladosError) {
            console.error('Erro ao buscar simulados:', {
                error: simuladosError.message,
                categoriaId: categoria_id,
                concursoId: concurso_id,
            });
        }

        // ========================================
        // BUSCAR FLASHCARDS
        // ========================================

        let cartoesQuery = supabase
            .from('cartoes_memorizacao')
            .select(`
                *,
                concursos (
                    *,
                    concurso_categorias (*)
                )
            `)
            .eq('categoria_id', categoria_id)
            .eq('concurso_id', concurso_id);

        if (disciplina) {
            cartoesQuery = cartoesQuery.eq('disciplina', disciplina);
        }

        const { data: cartoes, error: cartoesError } = await cartoesQuery
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (cartoesError) {
            console.error('Erro ao buscar cartões de memorização:', {
                error: cartoesError.message,
                categoriaId: categoria_id,
                concursoId: concurso_id,
            });
        }

        // ========================================
        // BUSCAR APOSTILAS
        // ========================================

        const apostilasQuery = supabase
            .from('apostilas')
            .select(`
                *,
                concursos (
                    *,
                    concurso_categorias (*)
                )
            `)
            .eq('categoria_id', categoria_id)
            .eq('concurso_id', concurso_id);

        const { data: apostilas, error: apostilasError } = await apostilasQuery
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (apostilasError) {
            console.error('Erro ao buscar apostilas:', {
                error: apostilasError.message,
                categoriaId: categoria_id,
                concursoId: concurso_id,
            });
        }

        // ========================================
        // BUSCAR MAPA DE ASSUNTOS
        // ========================================

        let mapaAssuntosQuery = supabase
            .from('mapa_assuntos')
            .select(`
                *,
                concursos (
                    *,
                    concurso_categorias (*)
                )
            `)
            .eq('categoria_id', categoria_id)
            .eq('concurso_id', concurso_id);

        if (disciplina) {
            mapaAssuntosQuery = mapaAssuntosQuery.eq('disciplina', disciplina);
        }

        const { data: mapaAssuntos, error: mapaAssuntosError } = await mapaAssuntosQuery
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (mapaAssuntosError) {
            console.error('Erro ao buscar mapa de assuntos:', {
                error: mapaAssuntosError.message,
                categoriaId: categoria_id,
                concursoId: concurso_id,
            });
        }

        // ========================================
        // CONTAR TOTAL DE ITENS
        // ========================================

        const [
            { count: totalSimulados },
            { count: totalFlashcards },
            { count: totalApostilas },
            { count: totalMapaAssuntos }
        ] = await Promise.all([
            supabase
                .from('simulados_personalizados')
                .select('*', { count: 'exact', head: true })
                .eq('categoria_id', categoria_id)
                .eq('concurso_id', concurso_id)
                .is('deleted_at', null),
            supabase
                .from('cartoes_memorizacao')
                .select('*', { count: 'exact', head: true })
                .eq('categoria_id', categoria_id)
                .eq('concurso_id', concurso_id),
            supabase
                .from('apostilas')
                .select('*', { count: 'exact', head: true })
                .eq('categoria_id', categoria_id)
                .eq('concurso_id', concurso_id),
            supabase
                .from('mapa_assuntos')
                .select('*', { count: 'exact', head: true })
                .eq('categoria_id', categoria_id)
                .eq('concurso_id', concurso_id)
        ]);

        const total = (totalSimulados || 0) + (totalFlashcards || 0) + (totalApostilas || 0) + (totalMapaAssuntos || 0);

        // ========================================
        // MONTAR RESPOSTA
        // ========================================

        const response = {
            success: true,
            data: {
                simulados: simulados || [],
                flashcards: cartoes || [],
                apostilas: apostilas || [],
                mapaAssuntos: mapaAssuntos || [],
            },
            total,
            page,
            limit,
        };

        // Log da consulta
        console.log('Conteúdo filtrado consultado:', {
            categoriaId: categoria_id,
            concursoId: concurso_id,
            disciplina,
            dificuldade,
            totalSimulados: simulados?.length || 0,
            totalFlashcards: cartoes?.length || 0,
            totalApostilas: apostilas?.length || 0,
            totalMapaAssuntos: mapaAssuntos?.length || 0,
        });

        res.json(response);
    } catch (error) {
        console.error('Erro interno ao buscar conteúdo filtrado:', {
            error: error instanceof Error ? error.message : String(error),
            categoriaId: req.query['categoria_id'],
            concursoId: req.query['concurso_id'],
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

export default router;
