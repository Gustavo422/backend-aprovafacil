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
    titulo: string;
    dificuldade: string;
}

interface usuariosimuladoProgress {
    id: string;
    user_id: string;
    concluido_at: string;
    time_taken_minutes: number | null;
    score: number;
    simulados_personalizados: SimuladoPersonalizado;
    [key: string]: unknown;
}

interface Activity {
    id: string;
    type: string;
    titulo: string;
    descricao: string;
    time: string;
    criado_em: string;
    score?: number;
    improvement?: number;
}

// GET - Buscar atividades do usuário
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const activities: Activity[] = [];

        // Buscar atividades de simulados-personalizados
        const { data: simuladoProgress } = await supabase
            .from('progresso_usuario_simulado')
            .select(`
                *,
                simulados_personalizados:simulados_personalizados (
                    titulo,
                    dificuldade
                )
            `)
            .eq('user_id', req.user.id)
            .order('concluido_at', { ascending: false })
            .limit(10) as { data: usuariosimuladoProgress[] | null };

        if (simuladoProgress) {
            for (const progress of simuladoProgress) {
                activities.push({
                    id: `simulado-${progress.id}`,
                    type: 'simulado',
                    titulo: progress.simulados_personalizados?.titulo || 'Simulado',
                    descricao: `Pontuação: ${progress.score}% - ${progress.simulados_personalizados?.dificuldade || 'Médio'}`,
                    time: progress.time_taken_minutes ? `${progress.time_taken_minutes}min` : '',
                    criado_em: progress.concluido_at,
                    score: progress.score,
                    improvement: 0, // Será calculado comparando com simulados-personalizados anteriores
                });
            }
        }

        // Buscar atividades de cartoes-memorizacao
        interface FlashcardProgress {
            id: string;
            criado_em: string;
            status: string;
            flashcard: {
                front: string;
                disciplina: string;
            } | null;
            atualizado_em: string;
            user_id: string;
            percentual_progresso?: number;
        }

        const { data: flashcardProgress } = await supabase
            .from('progresso_usuario_flashcard')
            .select(`
                *,
                flashcard:flashcard (
                    front,
                    disciplina
                )
            `)
            .eq('user_id', req.user.id)
            .order('atualizado_em', { ascending: false })
            .limit(10) as { data: FlashcardProgress[] | null };

        if (flashcardProgress) {
            for (const progress of flashcardProgress) {
                activities.push({
                    id: `flashcard-${progress.id}`,
                    type: 'flashcard',
                    titulo: 'Revisão de Flashcard',
                    descricao: `${progress.flashcard?.disciplina || 'Disciplina'} - ${progress.status}`,
                    time: '',
                    criado_em: progress.atualizado_em,
                });
            }
        }

        // Buscar atividades de apostilas
        interface ApostilaProgress {
            id: string;
            criado_em: string;
            atualizado_em: string;
            user_id: string;
            percentual_progresso: number;
            conteudo_apostila: {
                titulo: string;
            } | null;
        }

        const { data: apostilaProgress } = await supabase
            .from('progresso_usuario_apostila')
            .select(`
                *,
                conteudo_apostila (
                    titulo
                )
            `)
            .eq('user_id', req.user.id)
            .order('atualizado_em', { ascending: false })
            .limit(5) as { data: ApostilaProgress[] | null };

        if (apostilaProgress) {
            for (const progress of apostilaProgress) {
                activities.push({
                    id: `apostila-${progress.id}`,
                    type: 'questao',
                    titulo: 'Estudo de Apostila',
                    descricao: `${progress.conteudo_apostila?.titulo || 'Apostila'} - ${progress['percentual_progresso']}% concluído`,
                    time: '',
                    criado_em: progress.atualizado_em,
                });
            }
        }

        // Ordenar todas as atividades por data
        activities.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

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



