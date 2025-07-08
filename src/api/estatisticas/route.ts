import express from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import { asyncHandler } from '../../utils/routeWrapper.js';

const router = express.Router();

// Interfaces para tipagem
interface FlashcardData {
  disciplina?: string;
}

interface SimuladoQuestao {
  disciplina?: string;
}

interface SimuladoData {
  simulado_questoes?: SimuladoQuestao[];
}

interface QuestaoSemanalData {
  disciplina?: string;
}

interface UserData {
  nome?: string;
  email?: string;
}

// Schemas de validação
const estatisticasFiltrosSchema = z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  disciplina: z.string().optional()
});

// GET /api/estatisticas/geral - Estatísticas gerais do usuário
router.get('/geral', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar estatísticas de flashcards
    const { data: flashcardsStats, error: flashcardsError } = await supabase
      .from('user_flashcard_progress')
      .select('acertos, erros, tempo_gasto_minutos')
      .eq('user_id', userId);

    // Buscar estatísticas de simulados
    const { data: simuladosStats, error: simuladosError } = await supabase
      .from('user_simulado_progress')
      .select('acertos, erros, pontuacao, tempo_gasto_minutos, is_completed')
      .eq('user_id', userId);

    // Buscar estatísticas de questões semanais
    const { data: questoesStats, error: questoesError } = await supabase
      .from('questao_semanal_respostas')
      .select('is_correta, pontos_ganhos, tempo_gasto_segundos')
      .eq('user_id', userId);

    // Buscar estatísticas de mapa de assuntos
    const { data: assuntosStats, error: assuntosError } = await supabase
      .from('mapa_assuntos')
      .select('status, progresso_percentual')
      .eq('user_id', userId);

    if (flashcardsError || simuladosError || questoesError || assuntosError) {
      logger.error('Erro ao buscar estatísticas:', undefined, {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message,
        assuntosError: assuntosError?.message
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Calcular estatísticas de flashcards
    const flashcardsTotal = flashcardsStats?.length || 0;
    const flashcardsAcertos = flashcardsStats?.reduce((acc, item) => acc + (item.acertos || 0), 0) || 0;
    const flashcardsErros = flashcardsStats?.reduce((acc, item) => acc + (item.erros || 0), 0) || 0;
    const flashcardsTempo = flashcardsStats?.reduce((acc, item) => acc + (item.tempo_gasto_minutos || 0), 0) || 0;
    const flashcardsTaxaAcerto = flashcardsTotal > 0 ? (flashcardsAcertos / (flashcardsAcertos + flashcardsErros)) * 100 : 0;

    // Calcular estatísticas de simulados
    const simuladosTotal = simuladosStats?.length || 0;
    const simuladosCompletados = simuladosStats?.filter(item => item.is_completed).length || 0;
    const simuladosAcertos = simuladosStats?.reduce((acc, item) => acc + (item.acertos || 0), 0) || 0;
    const simuladosErros = simuladosStats?.reduce((acc, item) => acc + (item.erros || 0), 0) || 0;
    const simuladosPontuacao = simuladosStats?.reduce((acc, item) => acc + (item.pontuacao || 0), 0) || 0;
    const simuladosTempo = simuladosStats?.reduce((acc, item) => acc + (item.tempo_gasto_minutos || 0), 0) || 0;
    const simuladosTaxaAcerto = simuladosTotal > 0 ? (simuladosAcertos / (simuladosAcertos + simuladosErros)) * 100 : 0;

    // Calcular estatísticas de questões semanais
    const questoesTotal = questoesStats?.length || 0;
    const questoesAcertos = questoesStats?.filter(item => item.is_correta).length || 0;
    const questoesPontos = questoesStats?.reduce((acc, item) => acc + (item.pontos_ganhos || 0), 0) || 0;
    const questoesTempo = questoesStats?.reduce((acc, item) => acc + (item.tempo_gasto_segundos || 0), 0) || 0;
    const questoesTaxaAcerto = questoesTotal > 0 ? (questoesAcertos / questoesTotal) * 100 : 0;

    // Calcular estatísticas de mapa de assuntos
    const assuntosTotal = assuntosStats?.length || 0;
    const assuntosConcluidos = assuntosStats?.filter(item => item.status === 'concluido').length || 0;
    const assuntosEmAndamento = assuntosStats?.filter(item => item.status === 'em_andamento').length || 0;
    const assuntosPendentes = assuntosStats?.filter(item => item.status === 'pendente').length || 0;
    const assuntosProgressoMedio = assuntosTotal > 0 
      ? assuntosStats?.reduce((acc, item) => acc + (item.progresso_percentual || 0), 0) / assuntosTotal 
      : 0;

    const estatisticas = {
      flashcards: {
        total: flashcardsTotal,
        acertos: flashcardsAcertos,
        erros: flashcardsErros,
        tempoTotalMinutos: flashcardsTempo,
        taxaAcerto: Math.round(flashcardsTaxaAcerto * 100) / 100
      },
      simulados: {
        total: simuladosTotal,
        completados: simuladosCompletados,
        acertos: simuladosAcertos,
        erros: simuladosErros,
        pontuacaoTotal: simuladosPontuacao,
        tempoTotalMinutos: simuladosTempo,
        taxaAcerto: Math.round(simuladosTaxaAcerto * 100) / 100
      },
      questoesSemanais: {
        total: questoesTotal,
        acertos: questoesAcertos,
        pontosTotal: questoesPontos,
        tempoTotalSegundos: questoesTempo,
        taxaAcerto: Math.round(questoesTaxaAcerto * 100) / 100
      },
      mapaAssuntos: {
        total: assuntosTotal,
        concluidos: assuntosConcluidos,
        emAndamento: assuntosEmAndamento,
        pendentes: assuntosPendentes,
        progressoMedio: Math.round(assuntosProgressoMedio * 100) / 100
      },
      geral: {
        tempoTotalEstudo: flashcardsTempo + simuladosTempo + (questoesTempo / 60),
        taxaAcertoGeral: Math.round(((flashcardsAcertos + simuladosAcertos + questoesAcertos) / 
          (flashcardsAcertos + flashcardsErros + simuladosAcertos + simuladosErros + questoesTotal)) * 100 * 100) / 100
      }
    };

    return res.json({ success: true, data: estatisticas });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/geral:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/performance - Performance por período
router.get('/performance', requireAuth, validateRequest(estatisticasFiltrosSchema), asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { data_inicio, data_fim } = req.query;

    // TODO: Implementar filtros por concurso_id, categoria_id e disciplina
    // const { concurso_id, categoria_id, disciplina } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Construir filtros de data
    let dataFilter = '';
    if (data_inicio && data_fim) {
      dataFilter = `created_at.gte.${data_inicio},created_at.lte.${data_fim}`;
    } else if (data_inicio) {
      dataFilter = `created_at.gte.${data_inicio}`;
    } else if (data_fim) {
      dataFilter = `created_at.lte.${data_fim}`;
    }

    // Buscar performance de flashcards
    let flashcardsQuery = supabase
      .from('user_flashcard_progress')
      .select('acertos, erros, tempo_gasto_minutos, created_at')
      .eq('user_id', userId);

    if (dataFilter) {
      flashcardsQuery = flashcardsQuery.or(dataFilter);
    }

    const { data: flashcardsData, error: flashcardsError } = await flashcardsQuery;

    // Buscar performance de simulados
    let simuladosQuery = supabase
      .from('user_simulado_progress')
      .select('acertos, erros, pontuacao, tempo_gasto_minutos, created_at')
      .eq('user_id', userId);

    if (dataFilter) {
      simuladosQuery = simuladosQuery.or(dataFilter);
    }

    const { data: simuladosData, error: simuladosError } = await simuladosQuery;

    // Buscar performance de questões semanais
    let questoesQuery = supabase
      .from('questao_semanal_respostas')
      .select('is_correta, pontos_ganhos, tempo_gasto_segundos, created_at')
      .eq('user_id', userId);

    if (dataFilter) {
      questoesQuery = questoesQuery.or(dataFilter);
    }

    const { data: questoesData, error: questoesError } = await questoesQuery;

    if (flashcardsError || simuladosError || questoesError) {
      logger.error('Erro ao buscar performance:', undefined, {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Agrupar por dia
    const performancePorDia: Record<string, {
      data: string;
      flashcards: { acertos: number; erros: number; tempo: number };
      simulados: { acertos: number; erros: number; pontuacao: number; tempo: number };
      questoes: { acertos: number; total: number; pontos: number; tempo: number };
    }> = {};

    // Processar flashcards
    flashcardsData?.forEach(item => {
      const data = new Date(item.created_at).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.flashcards.acertos += item.acertos || 0;
          dia.flashcards.erros += item.erros || 0;
          dia.flashcards.tempo += item.tempo_gasto_minutos || 0;
        }
      }
    });

    // Processar simulados
    simuladosData?.forEach(item => {
      const data = new Date(item.created_at).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.simulados.acertos += item.acertos || 0;
          dia.simulados.erros += item.erros || 0;
          dia.simulados.pontuacao += item.pontuacao || 0;
          dia.simulados.tempo += item.tempo_gasto_minutos || 0;
        }
      }
    });

    // Processar questões semanais
    questoesData?.forEach(item => {
      const data = new Date(item.created_at).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.questoes.total += 1;
          dia.questoes.acertos += item.is_correta ? 1 : 0;
          dia.questoes.pontos += item.pontos_ganhos || 0;
          dia.questoes.tempo += item.tempo_gasto_segundos || 0;
        }
      }
    });

    // Converter para array e ordenar por data
    const performanceArray = Object.values(performancePorDia)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return res.json({ success: true, data: performanceArray });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/performance:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/disciplinas - Performance por disciplina
router.get('/disciplinas', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar flashcards por disciplina
    const { data: flashcardsDisciplinas, error: flashcardsError } = await supabase
      .from('user_flashcard_progress')
      .select(`
        acertos,
        erros,
        tempo_gasto_minutos,
        flashcards (
          disciplina
        )
      `)
      .eq('user_id', userId);

    // Buscar simulados por disciplina
    const { data: simuladosDisciplinas, error: simuladosError } = await supabase
      .from('user_simulado_progress')
      .select(`
        acertos,
        erros,
        pontuacao,
        tempo_gasto_minutos,
        simulados (
          simulado_questoes (
            disciplina
          )
        )
      `)
      .eq('user_id', userId);

    // Buscar questões semanais por disciplina
    const { data: questoesDisciplinas, error: questoesError } = await supabase
      .from('questao_semanal_respostas')
      .select(`
        is_correta,
        pontos_ganhos,
        tempo_gasto_segundos,
        questoes_semanais (
          disciplina
        )
      `)
      .eq('user_id', userId);

    if (flashcardsError || simuladosError || questoesError) {
      logger.error('Erro ao buscar estatísticas por disciplina:', undefined, {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Agrupar por disciplina
    const disciplinas: Record<string, {
      disciplina: string;
      flashcards: { acertos: number; erros: number; tempo: number };
      simulados: { acertos: number; erros: number; pontuacao: number; tempo: number };
      questoes: { acertos: number; total: number; pontos: number; tempo: number };
    }> = {};

    // Processar flashcards
    flashcardsDisciplinas?.forEach(item => {
      const disciplina = (item.flashcards as FlashcardData)?.disciplina || 'Sem disciplina';
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (disciplinas[disciplina]) {
        disciplinas[disciplina].flashcards.acertos += item.acertos || 0;
        disciplinas[disciplina].flashcards.erros += item.erros || 0;
        disciplinas[disciplina].flashcards.tempo += item.tempo_gasto_minutos || 0;
      }
    });

    // Processar simulados
    simuladosDisciplinas?.forEach(item => {
      const disciplinasSimulado = (item.simulados as SimuladoData)?.simulado_questoes?.map((q: SimuladoQuestao) => q.disciplina) || [];
      const disciplina = disciplinasSimulado[0] || 'Sem disciplina';
      
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (disciplinas[disciplina]) {
        disciplinas[disciplina].simulados.acertos += item.acertos || 0;
        disciplinas[disciplina].simulados.erros += item.erros || 0;
        disciplinas[disciplina].simulados.pontuacao += item.pontuacao || 0;
        disciplinas[disciplina].simulados.tempo += item.tempo_gasto_minutos || 0;
      }
    });

    // Processar questões semanais
    questoesDisciplinas?.forEach(item => {
      const disciplina = (item.questoes_semanais as QuestaoSemanalData)?.disciplina || 'Sem disciplina';
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 }
        };
      }
      if (disciplinas[disciplina]) {
        disciplinas[disciplina].questoes.total += 1;
        disciplinas[disciplina].questoes.acertos += item.is_correta ? 1 : 0;
        disciplinas[disciplina].questoes.pontos += item.pontos_ganhos || 0;
        disciplinas[disciplina].questoes.tempo += item.tempo_gasto_segundos || 0;
      }
    });

    // Calcular taxas de acerto e converter para array
    const disciplinasArray = Object.values(disciplinas).map((disc) => {
      const totalFlashcards = disc.flashcards.acertos + disc.flashcards.erros;
      const totalSimulados = disc.simulados.acertos + disc.simulados.erros;
      
      return {
        ...disc,
        taxaAcertoFlashcards: totalFlashcards > 0 ? Math.round((disc.flashcards.acertos / totalFlashcards) * 100 * 100) / 100 : 0,
        taxaAcertoSimulados: totalSimulados > 0 ? Math.round((disc.simulados.acertos / totalSimulados) * 100 * 100) / 100 : 0,
        taxaAcertoQuestoes: disc.questoes.total > 0 ? Math.round((disc.questoes.acertos / disc.questoes.total) * 100 * 100) / 100 : 0,
        tempoTotal: disc.flashcards.tempo + disc.simulados.tempo + (disc.questoes.tempo / 60)
      };
    });

    return res.json({ success: true, data: disciplinasArray });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/disciplinas:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/ranking - Ranking geral
router.get('/ranking', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Buscar ranking por pontos de questões semanais
    const { data: rankingQuestoes, error: questoesError } = await supabase
      .from('questao_semanal_respostas')
      .select(`
        user_id,
        pontos_ganhos,
        users (
          id,
          nome,
          email
        )
      `)
      .not('user_id', 'is', null);

    // Buscar ranking por pontuação de simulados
    const { data: rankingSimulados, error: simuladosError } = await supabase
      .from('user_simulado_progress')
      .select(`
        user_id,
        pontuacao,
        users (
          id,
          nome,
          email
        )
      `)
      .not('user_id', 'is', null);

    if (questoesError || simuladosError) {
      logger.error('Erro ao buscar ranking:', undefined, {
        questoesError: questoesError?.message,
        simuladosError: simuladosError?.message
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Agrupar por usuário
    const ranking: Record<string, {
      user_id: string;
      nome: string;
      email?: string;
      pontosQuestoes: number;
      pontosSimulados: number;
      totalAcertos: number;
      totalTempo: number;
    }> = {};

    // Processar questões semanais
    rankingQuestoes?.forEach(item => {
      const userId = item.user_id;
      if (!ranking[userId]) {
        ranking[userId] = {
          user_id: userId,
          nome: (item.users as UserData)?.nome || 'Usuário',
          email: (item.users as UserData)?.email,
          pontosQuestoes: 0,
          pontosSimulados: 0,
          totalAcertos: 0,
          totalTempo: 0
        } as typeof ranking[string];
      }
      if (ranking[userId]) {
        ranking[userId].pontosQuestoes += item.pontos_ganhos || 0;
      }
    });

    // Processar simulados
    rankingSimulados?.forEach(item => {
      const userId = item.user_id;
      if (!ranking[userId]) {
        ranking[userId] = {
          user_id: userId,
          nome: (item.users as UserData)?.nome || 'Usuário',
          email: (item.users as UserData)?.email,
          pontosQuestoes: 0,
          pontosSimulados: 0,
          totalAcertos: 0,
          totalTempo: 0
        } as typeof ranking[string];
      }
      if (ranking[userId]) {
        ranking[userId].pontosSimulados += item.pontuacao || 0;
      }
    });

    // Calcular pontuação total e ordenar
    const rankingFinal = Object.values(ranking)
      .map((user) => ({
        ...user,
        pontuacaoTotal: user.pontosQuestoes + user.pontosSimulados
      }))
      .sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal)
      .slice(0, Number(limit));

    return res.json({
      success: true,
      data: rankingFinal
    });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/ranking:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

export default router;
