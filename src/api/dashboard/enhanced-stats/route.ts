import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { requireAuth } from '../../../middleware/auth.js';
import { logger } from '../../../lib/logger.js';

const router = express.Router();

// GET - Buscar estatísticas aprimoradas do dashboard
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar estatísticas de simulados
    const { data: simuladosStats, error: simuladosError } = await supabase
      .from('progresso_usuario_simulado')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (simuladosError) {
      logger.error('Erro ao buscar estatísticas de simulados', { error: simuladosError.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Buscar estatísticas de questões semanais
    const { data: questoesStats, error: questoesError } = await supabase
      .from('questao_semanal_respostas')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (questoesError) {
      logger.error('Erro ao buscar estatísticas de questões semanais', { error: questoesError.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Buscar estatísticas de flashcards
    const { data: flashcardsStats, error: flashcardsError } = await supabase
      .from('progresso_usuario_flashcard')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (flashcardsError) {
      logger.error('Erro ao buscar estatísticas de flashcards', { error: flashcardsError.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Buscar estatísticas de mapa de assuntos
    const { data: assuntosStats, error: assuntosError } = await supabase
      .from('mapa_assuntos')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (assuntosError) {
      logger.error('Erro ao buscar estatísticas de assuntos', { error: assuntosError.message });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Calcular estatísticas de simulados
    const totalSimulados = simuladosStats?.length || 0;
    const simuladosCompletados = simuladosStats?.filter(s => s.is_concluido)?.length || 0;
    const mediaPontuacao = simuladosStats?.length > 0 
      ? simuladosStats.reduce((acc, curr) => acc + (curr.pontuacao || 0), 0) / simuladosStats.length 
      : 0;

    // Calcular estatísticas de questões semanais
    const totalQuestoes = questoesStats?.length || 0;
    const questoesCorretas = questoesStats?.filter(q => q.is_correta)?.length || 0;
    const taxaAcerto = totalQuestoes > 0 ? (questoesCorretas / totalQuestoes) * 100 : 0;
    const totalPontos = questoesStats?.reduce((acc, curr) => acc + (curr.pontos_ganhos || 0), 0) || 0;

    // Calcular estatísticas de flashcards
    const totalFlashcards = flashcardsStats?.length || 0;
    const flashcardsAcertos = flashcardsStats?.reduce((acc, curr) => acc + (curr.acertos || 0), 0) || 0;
    const flashcardsErros = flashcardsStats?.reduce((acc, curr) => acc + (curr.erros || 0), 0) || 0;
    const taxaAcertoFlashcards = (flashcardsAcertos + flashcardsErros) > 0 
      ? (flashcardsAcertos / (flashcardsAcertos + flashcardsErros)) * 100 
      : 0;

    // Calcular estatísticas de assuntos
    const totalAssuntos = assuntosStats?.length || 0;
    const assuntosConcluidos = assuntosStats?.filter(a => a.status === 'concluido')?.length || 0;
    const progressoMedio = assuntosStats?.length > 0 
      ? assuntosStats.reduce((acc, curr) => acc + (curr.progresso_percentual || 0), 0) / assuntosStats.length 
      : 0;

    // Calcular tendências (últimos 7 dias vs semana anterior)
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const quatorzeDiasAtras = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000);

    const simuladosUltimaSemana = simuladosStats?.filter(s => 
      new Date(s.criado_em) >= seteDiasAtras,
    )?.length || 0;

    const simuladosSemanaAnterior = simuladosStats?.filter(s => 
      new Date(s.criado_em) >= quatorzeDiasAtras && new Date(s.criado_em) < seteDiasAtras,
    )?.length || 0;

    const questoesUltimaSemana = questoesStats?.filter(q => 
      new Date(q.criado_em) >= seteDiasAtras,
    )?.length || 0;

    const questoesSemanaAnterior = questoesStats?.filter(q => 
      new Date(q.criado_em) >= quatorzeDiasAtras && new Date(q.criado_em) < seteDiasAtras,
    )?.length || 0;

    const stats = {
      simulados: {
        total: totalSimulados,
        completados: simuladosCompletados,
        em_andamento: totalSimulados - simuladosCompletados,
        media_pontuacao: Math.round(mediaPontuacao * 100) / 100,
        ultima_semana: simuladosUltimaSemana,
        semana_anterior: simuladosSemanaAnterior,
        tendencia: simuladosUltimaSemana > simuladosSemanaAnterior ? 'crescimento' : 'queda',
      },
      questoes_semanais: {
        total: totalQuestoes,
        corretas: questoesCorretas,
        taxa_acerto: Math.round(taxaAcerto * 100) / 100,
        total_pontos: totalPontos,
        ultima_semana: questoesUltimaSemana,
        semana_anterior: questoesSemanaAnterior,
        tendencia: questoesUltimaSemana > questoesSemanaAnterior ? 'crescimento' : 'queda',
      },
      flashcards: {
        total: totalFlashcards,
        acertos: flashcardsAcertos,
        erros: flashcardsErros,
        taxa_acerto: Math.round(taxaAcertoFlashcards * 100) / 100,
      },
      assuntos: {
        total: totalAssuntos,
        concluidos: assuntosConcluidos,
        em_andamento: assuntosStats?.filter(a => a.status === 'em_andamento')?.length || 0,
        pendentes: assuntosStats?.filter(a => a.status === 'pendente')?.length || 0,
        progresso_medio: Math.round(progressoMedio * 100) / 100,
      },
      geral: {
        total_atividades: totalSimulados + totalQuestoes + totalFlashcards,
        dias_ativos: calcularDiasAtivos(simuladosStats, questoesStats, flashcardsStats),
        nivel_consistencia: calcularNivelConsistencia(simuladosStats, questoesStats, flashcardsStats),
      },
    };

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição GET /api/dashboard/enhanced-stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Função para calcular dias ativos
function calcularDiasAtivos(simulados: unknown[], questoes: unknown[], flashcards: unknown[]): number {
  const datas = new Set<string>();
  
  simulados?.forEach(s => {
    if (typeof s === 'object' && s && 'criado_em' in s && (typeof s.criado_em === 'string' || typeof s.criado_em === 'number' || s.criado_em instanceof Date)) {
      datas.add(new Date(s.criado_em).toDateString());
    }
  });
  
  questoes?.forEach(q => {
    if (typeof q === 'object' && q && 'criado_em' in q && (typeof q.criado_em === 'string' || typeof q.criado_em === 'number' || q.criado_em instanceof Date)) {
      datas.add(new Date(q.criado_em).toDateString());
    }
  });
  
  flashcards?.forEach(f => {
    if (typeof f === 'object' && f && 'criado_em' in f && (typeof f.criado_em === 'string' || typeof f.criado_em === 'number' || f.criado_em instanceof Date)) {
      datas.add(new Date(f.criado_em).toDateString());
    }
  });
  
  return datas.size;
}

// Função para calcular nível de consistência
function calcularNivelConsistencia(simulados: unknown[], questoes: unknown[], flashcards: unknown[]): string {
  const diasAtivos = calcularDiasAtivos(simulados, questoes, flashcards);
  const totalAtividades = (simulados?.length || 0) + (questoes?.length || 0) + (flashcards?.length || 0);
  
  if (diasAtivos === 0 || totalAtividades === 0) {
    return 'iniciante';
  }
  
  const mediaAtividadesPorDia = totalAtividades / diasAtivos;
  
  if (mediaAtividadesPorDia >= 5) {
    return 'excelente';
  } else if (mediaAtividadesPorDia >= 3) {
    return 'bom';
  } else if (mediaAtividadesPorDia >= 1) {
    return 'regular';
  } else {
    return 'iniciante';
  }
}

export { router };
