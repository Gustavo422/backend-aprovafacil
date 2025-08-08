import type { Request, Response } from 'express';
import express from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';
import { logger } from '../../../lib/logger.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

interface Simulado {
    titulo: string;
    dificuldade: string;
}

interface UsuarioSimuladoProgress {
    id: string;
    usuario_id: string;
    concluido_em: string;
    tempo_gasto_minutos: number | null;
    pontuacao: number;
    simulados: Simulado;
    [key: string]: unknown;
}

interface Activity {
    id: string;
    type: string;
    titulo: string;
    descricao: string;
    time: string;
    created_at: string;
    score?: number;
    improvement?: number;
}

// GET - Buscar atividades do usuário
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const activities: Activity[] = [];

    // Buscar atividades de simulados
    const { data: simuladoProgress } = await supabase
      .from('progresso_usuario_simulado')
      .select(`
                *,
                simulados:simulados (
                    titulo,
                    dificuldade
                )
            `)
      .eq('usuario_id', (req as unknown as { user: { id: string } }).user.id)
      .order('concluido_em', { ascending: false })
      .limit(10) as { data: UsuarioSimuladoProgress[] | null };

    if (simuladoProgress) {
      for (const progress of simuladoProgress) {
        activities.push({
          id: `simulado-${progress.id}`,
          type: 'simulado',
          titulo: progress.simulados?.titulo || 'Simulado',
          descricao: `Pontuação: ${progress.pontuacao}% - ${progress.simulados?.dificuldade || 'Médio'}`,
          time: progress.tempo_gasto_minutos ? `${progress.tempo_gasto_minutos}min` : '',
          created_at: progress.concluido_em,
          score: progress.pontuacao,
          improvement: 0, // Será calculado comparando com simulados anteriores
        });
      }
    }

        // Buscar atividades de cartoes-memorizacao
        interface FlashcardProgress {
            id: string;
            criado_em: string;
            status: string;
            cartoes_memorizacao: {
                frente: string;
                disciplina: string;
            } | null;
            atualizado_em: string;
            usuario_id: string;
        }

        const { data: flashcardProgress } = await supabase
          .from('progresso_usuario_flashcard')
          .select(`
                *,
                cartoes_memorizacao:cartoes_memorizacao (
                    frente,
                    disciplina
                )
            `)
          .eq('usuario_id', (req as unknown as { user: { id: string } }).user.id)
          .order('atualizado_em', { ascending: false })
          .limit(10) as { data: FlashcardProgress[] | null };

        if (flashcardProgress) {
          for (const progress of flashcardProgress) {
            activities.push({
              id: `flashcard-${progress.id}`,
              type: 'flashcard',
              titulo: 'Revisão de Flashcard',
              descricao: `${progress.cartoes_memorizacao?.disciplina || 'Disciplina'} - ${progress.status}`,
              time: '',
              created_at: progress.atualizado_em,
            });
          }
        }

        // Buscar atividades de apostilas
        interface ApostilaProgress {
            id: string;
            criado_em: string;
            atualizado_em: string;
            usuario_id: string;
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
          .eq('usuario_id', (req as unknown as { user: { id: string } }).user.id)
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
              created_at: progress.atualizado_em,
            });
          }
        }

        // Ordenar todas as atividades por data
        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Calcular melhorias para simulados
        if (simuladoProgress && simuladoProgress.length > 1) {
          for (let i = 0; i < activities.length; i++) {
            const activity = activities[i];
            if (activity && activity.type === 'simulado' && activity.score) {
              // Encontrar simulado anterior
              const currentSimuladoId = activity.id.replace('simulado-', '');
              const currentIndex = simuladoProgress.findIndex(sp => sp.id === currentSimuladoId);
                    
              if (currentIndex > 0) {
                const previousSimulado = simuladoProgress[currentIndex - 1];
                if (previousSimulado?.pontuacao !== undefined) {
                  activity.improvement = activity.score - previousSimulado.pontuacao;
                }
              }
            }
          }
        }

        res.json({
          success: true,
          data: activities.slice(0, 10),
        });

  } catch (error) {
    logger.error('Erro ao buscar atividades do dashboard:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Registrar rotas
// TODO: Adicionar rotas específicas para cada arquivo

export { router };
