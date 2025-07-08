import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

interface SimuladoPersonalizado {
    title: string;
    difficulty: string;
}

interface UserSimuladoProgress {
    id: string;
    user_id: string;
    completed_at: string;
    time_taken_minutes: number | null;
    score: number;
    simulados_personalizados: SimuladoPersonalizado;
    [key: string]: unknown;
}

interface Activity {
    id: string;
    type: string;
    title: string;
    description: string;
    time: string;
    created_at: string;
    score?: number;
    improvement?: number;
}

// GET - Buscar atividades do usuário
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const activities: Activity[] = [];

        // Buscar atividades de simulados-personalizados
        const { data: simuladoProgress } = await supabase
            .from('user_simulado_progress')
            .select(`
                *,
                simulados_personalizados:simulados_personalizados (
                    title,
                    difficulty
                )
            `)
            .eq('user_id', req.user.id)
            .order('completed_at', { ascending: false })
            .limit(10) as { data: UserSimuladoProgress[] | null };

        if (simuladoProgress) {
            for (const progress of simuladoProgress) {
                activities.push({
                    id: `simulado-${progress.id}`,
                    type: 'simulado',
                    title: progress.simulados_personalizados?.title || 'Simulado',
                    description: `Pontuação: ${progress.score}% - ${progress.simulados_personalizados?.difficulty || 'Médio'}`,
                    time: progress.time_taken_minutes ? `${progress.time_taken_minutes}min` : '',
                    created_at: progress.completed_at,
                    score: progress.score,
                    improvement: 0, // Será calculado comparando com simulados-personalizados anteriores
                });
            }
        }

        // Buscar atividades de cartoes-memorizacao
        interface FlashcardProgress {
            id: string;
            created_at: string;
            status: string;
            flashcard: {
                front: string;
                disciplina: string;
            } | null;
            updated_at: string;
            user_id: string;
            progress_percentage?: number;
        }

        const { data: flashcardProgress } = await supabase
            .from('user_flashcard_progress')
            .select(`
                *,
                flashcard:flashcard (
                    front,
                    disciplina
                )
            `)
            .eq('user_id', req.user.id)
            .order('updated_at', { ascending: false })
            .limit(10) as { data: FlashcardProgress[] | null };

        if (flashcardProgress) {
            for (const progress of flashcardProgress) {
                activities.push({
                    id: `flashcard-${progress.id}`,
                    type: 'flashcard',
                    title: 'Revisão de Flashcard',
                    description: `${progress.flashcard?.disciplina || 'Disciplina'} - ${progress.status}`,
                    time: '',
                    created_at: progress.updated_at,
                });
            }
        }

        // Buscar atividades de apostilas
        interface ApostilaProgress {
            id: string;
            created_at: string;
            updated_at: string;
            user_id: string;
            progress_percentage: number;
            apostila_content: {
                title: string;
            } | null;
        }

        const { data: apostilaProgress } = await supabase
            .from('user_apostila_progress')
            .select(`
                *,
                apostila_content (
                    title
                )
            `)
            .eq('user_id', req.user.id)
            .order('updated_at', { ascending: false })
            .limit(5) as { data: ApostilaProgress[] | null };

        if (apostilaProgress) {
            for (const progress of apostilaProgress) {
                activities.push({
                    id: `apostila-${progress.id}`,
                    type: 'questao',
                    title: 'Estudo de Apostila',
                    description: `${progress.apostila_content?.title || 'Apostila'} - ${progress['progress_percentage']}% concluído`,
                    time: '',
                    created_at: progress.updated_at,
                });
            }
        }

        // Ordenar todas as atividades por data
        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Calcular melhorias para simulados-personalizados
        if (simuladoProgress && simuladoProgress.length > 1) {
            for (let i = 0; i < activities.length; i++) {
                const activity = activities[i];
                if (activity && activity.type === 'simulado' && activity.score) {
                    // Encontrar simulado anterior
                    const currentSimuladoId = activity.id.replace('simulado-', '');
                    const currentIndex = simuladoProgress.findIndex(sp => sp.id === currentSimuladoId);
                    
                    if (currentIndex > 0) {
                        const previousSimulado = simuladoProgress[currentIndex - 1];
                        if (previousSimulado?.score !== undefined) {
                            activity.improvement = activity.score - previousSimulado.score;
                        }
                    }
                }
            }
        }

        res.json({
            success: true,
            data: activities.slice(0, 10)
        });

    } catch (error) {
        console.error('Erro ao buscar atividades:', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

export default router;
