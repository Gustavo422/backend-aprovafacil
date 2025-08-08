import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { asyncHandler } from '../../utils/routeWrapper.js';

const createRouter = () => express.Router();
const router = createRouter();

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

interface RankingItem {
  usuario_id: string;
  usuarios?: UserData;
  pontos_ganhos?: number;
  pontuacao?: number;
}

interface RankingSimuladoItem {
  usuario_id: string;
  usuarios?: UserData;
  pontuacao?: number;
}

// Schemas de validação
const estatisticasFiltrosSchema = z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  disciplina: z.string().optional(),
});

// Middleware de validação Express local
const createValidationMiddleware = (schema: z.ZodTypeAny, field: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body as unknown : field === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      if (field === 'body') {
        req.body = result.data as Record<string, unknown>;
      } else if (field === 'query') {
        req.query = result.data as Record<string, string | string[] | undefined>;
      } else {
        req.params = result.data as Record<string, string>;
      }
      next();
    } catch {
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR',
      });
    }
  };
};

// GET /api/estatisticas/geral - Estatísticas gerais do usuário
router.get('/geral', requireAuth, asyncHandler(async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar estatísticas de flashcards
    const { data: flashcardsStats, error: flashcardsError } = await supabase
      .from('progresso_usuario_flashcard')
      .select('status, contador_revisoes')
      .eq('usuario_id', usuarioId);

    // Buscar estatísticas de simulados
    const { data: simuladosStats, error: simuladosError } = await supabase
      .from('progresso_usuario_simulado')
      .select('pontuacao, tempo_gasto_minutos, concluido_em')
      .eq('usuario_id', usuarioId);

    // Buscar estatísticas de questões semanais
    const { data: questoesStats, error: questoesError } = await supabase
      .from('respostas_questoes_semanais')
      .select('*')
      .eq('usuario_id', usuarioId);

    // Buscar estatísticas de mapa de assuntos
    const { data: assuntosStats, error: assuntosError } = await supabase
      .from('progresso_usuario_mapa_assuntos')
      .select('status')
      .eq('usuario_id', usuarioId);

    if (flashcardsError || simuladosError || questoesError || assuntosError) {
      logger.error('Erro ao buscar estatísticas', {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message,
        assuntosError: assuntosError?.message,
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Calcular estatísticas de flashcards
    const flashcardsTotal = flashcardsStats?.length ?? 0;
    const flashcardsDominados = flashcardsStats?.filter(item => item.status === 'dominado').length ?? 0;
    const flashcardsEmRevisao = flashcardsStats?.filter(item => item.status === 'revisando').length ?? 0;
    const flashcardsTotalRevisoes = flashcardsStats?.reduce((acc, item) => acc + (item.contador_revisoes ?? 0), 0) ?? 0;
    const flashcardsTaxaAcerto = flashcardsTotal > 0 ? (flashcardsDominados / flashcardsTotal) * 100 : 0;

    // Calcular estatísticas de simulados
    const simuladosTotal = simuladosStats?.length ?? 0;
    const simuladosCompletados = simuladosStats?.filter(item => item.concluido_em !== null).length ?? 0;
    const simuladosPontuacao = simuladosStats?.reduce((acc, item) => acc + (item.pontuacao ?? 0), 0) ?? 0;
    const simuladosTempo = simuladosStats?.reduce((acc, item) => acc + (item.tempo_gasto_minutos ?? 0), 0) ?? 0;
    const simuladosTaxaAcerto = simuladosTotal > 0 ? (simuladosPontuacao / simuladosTempo) * 100 : 0; // Assuming pontuacao is directly related to tempo for simplicity

    // Calcular estatísticas de questões semanais
    const questoesTotal = questoesStats?.length ?? 0;
    const questoesAcertos = questoesStats?.filter(item => item.correta).length ?? 0;
    const questoesPontos = questoesStats?.reduce((acc, item) => acc + (item.pontos_ganhos ?? 0), 0) ?? 0;
    const questoesTempo = questoesStats?.reduce((acc, item) => acc + (item.tempo_gasto_segundos ?? 0), 0) ?? 0;
    const questoesTaxaAcerto = questoesTotal > 0 ? (questoesAcertos / questoesTotal) * 100 : 0;

    // Calcular estatísticas de mapa de assuntos
    const assuntosTotal = assuntosStats?.length ?? 0;
    const assuntosConcluidos = assuntosStats?.filter(item => item.status === 'concluido').length ?? 0;
    const assuntosEmAndamento = assuntosStats?.filter(item => item.status === 'em_andamento').length ?? 0;
    const assuntosPendentes = assuntosStats?.filter(item => item.status === 'pendente').length ?? 0;
    const assuntosProgressoMedio = assuntosTotal > 0 
      ? ((assuntosStats?.filter(item => item.status === 'concluido').length ?? 0) / assuntosTotal) * 100
      : 0;

    const estatisticas = {
      flashcards: {
        total: flashcardsTotal,
        acertos: flashcardsDominados,
        erros: flashcardsEmRevisao,
        tempoTotalMinutos: flashcardsTotalRevisoes,
        taxaAcerto: Math.round(flashcardsTaxaAcerto * 100) / 100,
      },
      simulados: {
        total: simuladosTotal,
        completados: simuladosCompletados,
        pontuacaoTotal: simuladosPontuacao,
        tempoTotalMinutos: simuladosTempo,
        taxaAcerto: Math.round(simuladosTaxaAcerto * 100) / 100,
      },
      questoesSemanais: {
        total: questoesTotal,
        acertos: questoesAcertos,
        pontosTotal: questoesPontos,
        tempoTotalSegundos: questoesTempo,
        taxaAcerto: Math.round(questoesTaxaAcerto * 100) / 100,
      },
      mapaAssuntos: {
        total: assuntosTotal,
        concluidos: assuntosConcluidos,
        emAndamento: assuntosEmAndamento,
        pendentes: assuntosPendentes,
        progressoMedio: Math.round(assuntosProgressoMedio * 100) / 100,
      },
      geral: {
        tempoTotalEstudo: flashcardsTotalRevisoes + simuladosTempo + (questoesTempo / 60),
        taxaAcertoGeral: Math.round(((flashcardsDominados + questoesAcertos) / 
          (flashcardsTotal + questoesTotal)) * 100 * 100) / 100,
      },
    };

    return res.json({ success: true, data: estatisticas });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/geral', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/performance - Performance por período
router.get('/performance', requireAuth, createValidationMiddleware(estatisticasFiltrosSchema, 'query'), asyncHandler(async (req: Request, res: Response) => {
  try {
    const usuarioId = req.user?.id;
    const { data_inicio, data_fim } = req.query;

    // Filtros por concurso_id, categoria_id e disciplina
    // const { concurso_id, categoria_id, disciplina } = req.query;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Construir filtros de data
    let dataFilter = '';
    if (data_inicio && data_fim) {
      dataFilter = `criado_em.gte.${String(data_inicio)},criado_em.lte.${String(data_fim)}`;
    } else if (data_inicio) {
      dataFilter = `criado_em.gte.${String(data_inicio)}`;
    } else if (data_fim) {
      dataFilter = `criado_em.lte.${String(data_fim)}`;
    }

    // Buscar performance de flashcards
    let flashcardsQuery = supabase
      .from('progresso_usuario_flashcard')
      .select('acertos, erros, tempo_gasto_minutos, criado_em')
      .eq('usuario_id', usuarioId);

    if (dataFilter) {
      flashcardsQuery = flashcardsQuery.or(dataFilter);
    }

    const { data: flashcardsData, error: flashcardsError } = await flashcardsQuery;

    // Buscar performance de simulados
    let simuladosQuery = supabase
      .from('progresso_usuario_simulado')
      .select('pontuacao, tempo_gasto_minutos, criado_em')
      .eq('usuario_id', usuarioId);

    if (dataFilter) {
      simuladosQuery = simuladosQuery.or(dataFilter);
    }

    const { data: simuladosData, error: simuladosError } = await simuladosQuery;

    // Buscar performance de questões semanais
    let questoesQuery = supabase
      .from('respostas_questoes_semanais')
      .select('correta, pontos_ganhos, tempo_gasto_segundos, criado_em')
      .eq('usuario_id', usuarioId);

    if (dataFilter) {
      questoesQuery = questoesQuery.or(dataFilter);
    }

    const { data: questoesData, error: questoesError } = await questoesQuery;

    if (flashcardsError || simuladosError || questoesError) {
      logger.error('Erro ao buscar performance', {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message,
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
      const data = new Date(item.criado_em).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.flashcards.acertos += item.acertos ?? 0;
          dia.flashcards.erros += item.erros ?? 0;
          dia.flashcards.tempo += item.tempo_gasto_minutos ?? 0;
        }
      }
    });

    // Processar simulados
    simuladosData?.forEach(item => {
      const data = new Date(item.criado_em).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.simulados.acertos += item.pontuacao ?? 0; // Assuming pontuacao is the correct metric for simulados
          dia.simulados.erros += 0; // No erros in simulado_questoes
          dia.simulados.pontuacao += item.pontuacao ?? 0;
          dia.simulados.tempo += item.tempo_gasto_minutos ?? 0;
        }
      }
    });

    // Processar questões semanais
    questoesData?.forEach(item => {
      const data = new Date(item.criado_em).toISOString().split('T')[0];
      if (data && !performancePorDia[data]) {
        performancePorDia[data] = {
          data,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      if (data) {
        const dia = performancePorDia[data];
        if (dia) {
          dia.questoes.total += 1;
          dia.questoes.acertos += item.correta ? 1 : 0;
          dia.questoes.pontos += item.pontos_ganhos ?? 0;
          dia.questoes.tempo += item.tempo_gasto_segundos ?? 0;
        }
      }
    });

    // Converter para array e ordenar por data
    const performanceArray = Object.values(performancePorDia)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return res.json({ success: true, data: performanceArray });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/performance', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/disciplinas - Performance por disciplina
router.get('/disciplinas', requireAuth, asyncHandler(async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar flashcards por disciplina
    const { data: flashcardsDisciplinas, error: flashcardsError } = await supabase
      .from('progresso_usuario_flashcard')
      .select(`
        acertos,
        erros,
        tempo_gasto_minutos,
        flashcards (
          disciplina
        )
      `)
      .eq('usuario_id', usuarioId);

    // Buscar simulados por disciplina
    const { data: simuladosDisciplinas, error: simuladosError } = await supabase
      .from('progresso_usuario_simulado')
      .select(`
        pontuacao,
        tempo_gasto_minutos,
        simulados (
          simulado_questoes (
            disciplina
          )
        )
      `)
      .eq('usuario_id', usuarioId);

    // Buscar questões semanais por disciplina
    const { data: questoesDisciplinas, error: questoesError } = await supabase
      .from('respostas_questoes_semanais')
      .select(`
        correta,
        pontos_ganhos,
        tempo_gasto_segundos,
        questoes_semanais (
          disciplina
        )
      `)
      .eq('usuario_id', usuarioId);

    if (flashcardsError || simuladosError || questoesError) {
      logger.error('Erro ao buscar estatísticas por disciplina', {
        flashcardsError: flashcardsError?.message,
        simuladosError: simuladosError?.message,
        questoesError: questoesError?.message,
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
      const disciplina = (item.flashcards as FlashcardData)?.disciplina ?? 'Sem disciplina';
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      disciplinas[disciplina] ??= {
        disciplina,
        flashcards: { acertos: 0, erros: 0, tempo: 0 },
        simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
        questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
      };
      disciplinas[disciplina].flashcards.acertos += item.acertos ?? 0;
      disciplinas[disciplina].flashcards.erros += item.erros ?? 0;
      disciplinas[disciplina].flashcards.tempo += item.tempo_gasto_minutos ?? 0;
    });

    // Processar simulados
    simuladosDisciplinas?.forEach(item => {
      const disciplinasSimulado = (item.simulados as SimuladoData)?.simulado_questoes?.map((q: SimuladoQuestao) => q.disciplina) ?? [];
      const disciplina = disciplinasSimulado[0] ?? 'Sem disciplina';
      
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      disciplinas[disciplina] ??= {
        disciplina,
        flashcards: { acertos: 0, erros: 0, tempo: 0 },
        simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
        questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
      };
      disciplinas[disciplina].simulados.acertos += item.pontuacao ?? 0; // Assuming pontuacao is the correct metric for simulados
      disciplinas[disciplina].simulados.erros += 0; // No erros in simulado_questoes
      disciplinas[disciplina].simulados.pontuacao += item.pontuacao ?? 0;
      disciplinas[disciplina].simulados.tempo += item.tempo_gasto_minutos ?? 0;
    });

    // Processar questões semanais
    questoesDisciplinas?.forEach(item => {
      const disciplina = (item.questoes_semanais as QuestaoSemanalData)?.disciplina ?? 'Sem disciplina';
      if (!disciplinas[disciplina]) {
        disciplinas[disciplina] = {
          disciplina,
          flashcards: { acertos: 0, erros: 0, tempo: 0 },
          simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
          questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
        };
      }
      disciplinas[disciplina] ??= {
        disciplina,
        flashcards: { acertos: 0, erros: 0, tempo: 0 },
        simulados: { acertos: 0, erros: 0, pontuacao: 0, tempo: 0 },
        questoes: { acertos: 0, total: 0, pontos: 0, tempo: 0 },
      };
      disciplinas[disciplina].questoes.total += 1;
      disciplinas[disciplina].questoes.acertos += item.correta ? 1 : 0;
      disciplinas[disciplina].questoes.pontos += item.pontos_ganhos ?? 0;
      disciplinas[disciplina].questoes.tempo += item.tempo_gasto_segundos ?? 0;
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
        tempoTotal: disc.flashcards.tempo + disc.simulados.tempo + (disc.questoes.tempo / 60),
      };
    });

    return res.json({ success: true, data: disciplinasArray });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/disciplinas', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

// GET /api/estatisticas/ranking - Ranking geral
router.get('/ranking', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Buscar ranking por pontos de questões semanais
    const { data: rankingQuestoes, error: questoesError } = await supabase
      .from('respostas_questoes_semanais')
      .select(`
        usuario_id,
        pontos_ganhos,
        usuarios (
          id,
          nome,
          email
        )
      `)
      .not('usuario_id', 'is', null) as { data: RankingItem[] | null; error: Error | null };

    // Buscar ranking por pontuação de simulados
    const { data: rankingSimulados, error: simuladosError } = await supabase
      .from('progresso_usuario_simulado')
      .select(`
        usuario_id,
        pontuacao,
        usuarios (
          id,
          nome,
          email
        )
      `)
      .not('usuario_id', 'is', null) as { data: RankingSimuladoItem[] | null; error: Error | null };

    if (questoesError || simuladosError) {
      logger.error('Erro ao buscar ranking', {
        questoesError: questoesError?.message,
        simuladosError: simuladosError?.message,
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Agrupar por usuário
    const ranking: Record<string, {
      usuario_id: string;
      nome: string;
      email?: string;
      pontosQuestoes: number;
      pontosSimulados: number;
      totalAcertos: number;
      totalTempo: number;
    }> = {};

    // Processar questões semanais
    rankingQuestoes && rankingQuestoes.forEach(item => {
      const usuarioId = item.usuario_id;
      if (!ranking[usuarioId]) {
        ranking[usuarioId] = {
          usuario_id: usuarioId,
          nome: (item.usuarios as UserData)?.nome ?? 'Usuário',
          email: (item.usuarios as UserData)?.email ?? undefined,
          pontosQuestoes: 0,
          pontosSimulados: 0,
          totalAcertos: 0,
          totalTempo: 0,
        } as typeof ranking[string];
      }
      if (ranking[usuarioId]) {
        ranking[usuarioId].pontosQuestoes += item.pontos_ganhos ?? 0;
      }
    });

    // Processar simulados
    rankingSimulados && rankingSimulados.forEach(item => {
      const usuarioId = item.usuario_id;
      if (!ranking[usuarioId]) {
        ranking[usuarioId] = {
          usuario_id: usuarioId,
          nome: (item.usuarios as UserData)?.nome ?? 'Usuário',
          email: (item.usuarios as UserData)?.email ?? undefined,
          pontosQuestoes: 0,
          pontosSimulados: 0,
          totalAcertos: 0,
          totalTempo: 0,
        } as typeof ranking[string];
      }
      if (ranking[usuarioId]) {
        ranking[usuarioId].pontosSimulados += item.pontuacao ?? 0;
      }
    });

    // Calcular pontuação total e ordenar
    const rankingFinal = Object.values(ranking)
      .map((user) => ({
        ...user,
        pontuacaoTotal: user.pontosQuestoes + user.pontosSimulados,
      }))
      .sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal)
      .slice(0, Number(limit));

    return res.json({
      success: true,
      data: rankingFinal,
    });
  } catch (error) {
    logger.error('Erro na rota GET /estatisticas/ranking', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}));

export { router };
