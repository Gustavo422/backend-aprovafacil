import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { requireAuth } from '../../../middleware/auth.js';

const router = express.Router();

// GET - Buscar estatísticas básicas do dashboard
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { concurso_id } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Inicializar estatísticas básicas
    const stats = {
      simulados: {
        total: 0,
        concluidos: 0,
        media_pontuacao: 0
      },
      questoes_semanais: {
        total: 0,
        respondidas: 0,
        acertos: 0
      },
      flashcards: {
        total: 0,
        dominados: 0,
        em_revisao: 0
      },
      apostilas: {
        total: 0,
        modulos_concluidos: 0,
        progresso_medio: 0
      },
      tempo_estudo: {
        total_minutos: 0,
        media_diaria: 0,
        dias_ativos: 0
      }
    };

    // Query base para filtrar por concurso se especificado
    const concursoFilter = concurso_id ? { concurso_id } : {};

    // Buscar estatísticas de simulados
    let simuladosQuery = supabase
      .from('progresso_usuario_simulado')
      .select('*')
      .eq('usuario_id', userId);

    if (concurso_id) {
      // Join com simulados para filtrar por concurso
      simuladosQuery = supabase
        .from('progresso_usuario_simulado')
        .select(`
          *,
          simulados!inner(concurso_id)
        `)
        .eq('usuario_id', userId)
        .eq('simulados.concurso_id', concurso_id);
    }

    const { data: simuladosData } = await simuladosQuery;

    if (simuladosData) {
      stats.simulados.total = simuladosData.length;
      stats.simulados.concluidos = simuladosData.filter(s => s.concluido_em).length;
      const pontuacoes = simuladosData.filter(s => s.pontuacao > 0).map(s => s.pontuacao);
      stats.simulados.media_pontuacao = pontuacoes.length > 0 
        ? Math.round((pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length) * 100) / 100 
        : 0;
    }

    // Buscar estatísticas de questões semanais
    let questoesQuery = supabase
      .from('progresso_usuario_questoes_semanais')
      .select('*')
      .eq('usuario_id', userId);

    if (concurso_id) {
      questoesQuery = supabase
        .from('progresso_usuario_questoes_semanais')
        .select(`
          *,
          questoes_semanais!inner(concurso_id)
        `)
        .eq('usuario_id', userId)
        .eq('questoes_semanais.concurso_id', concurso_id);
    }

    const { data: questoesData } = await questoesQuery;

    if (questoesData) {
      stats.questoes_semanais.total = questoesData.length;
      stats.questoes_semanais.respondidas = questoesData.filter(q => q.concluido_em).length;
      const respostasCorretas = questoesData
        .filter(q => q.respostas)
        .reduce((total, q) => {
          const respostas = Array.isArray(q.respostas) ? q.respostas : [];
          return total + respostas.filter(r => r.correta).length;
        }, 0);
      stats.questoes_semanais.acertos = respostasCorretas;
    }

    // Buscar estatísticas de flashcards
    let flashcardsQuery = supabase
      .from('progresso_usuario_flashcard')
      .select(`
        *,
        cartoes_memorizacao!inner(concurso_id)
      `)
      .eq('usuario_id', userId);

    if (concurso_id) {
      flashcardsQuery = flashcardsQuery.eq('cartoes_memorizacao.concurso_id', concurso_id);
    }

    const { data: flashcardsData } = await flashcardsQuery;

    if (flashcardsData) {
      stats.flashcards.total = flashcardsData.length;
      stats.flashcards.dominados = flashcardsData.filter(f => f.status === 'dominado').length;
      stats.flashcards.em_revisao = flashcardsData.filter(f => f.status === 'revisando').length;
    }

    // Buscar estatísticas de apostilas
    let apostilasQuery = supabase
      .from('progresso_usuario_apostila')
      .select(`
        *,
        conteudo_apostila!inner(concurso_id)
      `)
      .eq('usuario_id', userId);

    if (concurso_id) {
      apostilasQuery = apostilasQuery.eq('conteudo_apostila.concurso_id', concurso_id);
    }

    const { data: apostilasData } = await apostilasQuery;

    if (apostilasData) {
      stats.apostilas.total = apostilasData.length;
      stats.apostilas.modulos_concluidos = apostilasData.filter(a => a.concluido).length;
      const progressos = apostilasData.map(a => a.percentual_progresso || 0);
      stats.apostilas.progresso_medio = progressos.length > 0
        ? Math.round((progressos.reduce((a, b) => a + b, 0) / progressos.length) * 100) / 100
        : 0;
    }

    // Buscar estatísticas de tempo de estudo do usuário
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('tempo_estudo_minutos, criado_em')
      .eq('id', userId)
      .single();

    if (usuarioData) {
      stats.tempo_estudo.total_minutos = usuarioData.tempo_estudo_minutos || 0;
      
      // Calcular dias desde criação da conta
      const diasCriacao = Math.ceil(
        (new Date().getTime() - new Date(usuarioData.criado_em).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      stats.tempo_estudo.media_diaria = diasCriacao > 0
        ? Math.round((stats.tempo_estudo.total_minutos / diasCriacao) * 100) / 100
        : 0;
      
      // Estimar dias ativos (baseado em atividades realizadas)
      const totalAtividades = stats.simulados.concluidos + stats.questoes_semanais.respondidas + stats.apostilas.modulos_concluidos;
      stats.tempo_estudo.dias_ativos = Math.min(totalAtividades, diasCriacao);
    }

    res.json({
      success: true,
      data: stats,
      meta: {
        usuario_id: userId,
        concurso_id: concurso_id || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router; 