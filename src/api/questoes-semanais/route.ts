// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    // Verificar se o usuário está autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao verificar usuário:', {
      //   error: userError.message || String(userError),
      //   code: userError.code,
      // });
      return NextResponse.json({ error: 'Erro de autenticação' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter a semana atual
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 +
        startOfYear.getDay() +
        1) /
        7
    );

    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.info('Buscando questões semanais:', {
    //   weekNumber,
    //   year: now.getFullYear(),
    //   userId: user.id,
    //   currentDate: now.toISOString(),
    // });

    // Primeiro, vamos verificar se existem questões semanais no banco
    const { data: todasQuestoesSemanais, error: todasError } = await supabase
      .from('questoes_semanais')
      .select('*')
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(5);

    if (todasError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar todas as questões semanais:', {
      //   error: todasError.message || String(todasError),
      //   code: todasError.code,
      // });
    } else {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.info('Questões semanais existentes no banco:', {
      //   total: todasQuestoesSemanais?.length || 0,
      //   questoes: todasQuestoesSemanais?.map(qs => ({
      //     id: qs.id,
      //     title: qs.title,
      //     week_number: qs.week_number,
      //     year: qs.year,
      //   })) || [],
      // });
    }

    // Buscar as questões semanais para a semana atual
    const { data: questoesSemanais, error } = await supabase
      .from('questoes_semanais')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', now.getFullYear())
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 é o código para "no rows returned"
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar questões semanais:', {
      //   error: error.message || String(error),
      //   code: error.code,
      //   weekNumber,
      //   year: now.getFullYear(),
      // });
      return NextResponse.json(
        { error: 'Erro ao buscar questões semanais' },
        { status: 500 }
      );
    }

    // Se não houver questões para a semana atual, vamos buscar a questão semanal mais recente
    if (!questoesSemanais) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.info('Nenhuma questão semanal encontrada para a semana atual:', {
      //   weekNumber,
      //   year: now.getFullYear(),
      // });

      // Buscar a questão semanal mais recente
      const { data: questaoRecente, error: recenteError } = await supabase
        .from('questoes_semanais')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(1)
        .single();

      if (recenteError && recenteError.code !== 'PGRST116') {
        // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
        // logger.error('Erro ao buscar questão semanal recente:', {
        //   error: recenteError.message || String(recenteError),
        //   code: recenteError.code,
        // });
      }

      if (questaoRecente) {
        // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
        // logger.info('Usando questão semanal mais recente:', {
        //   id: questaoRecente.id,
        //   title: questaoRecente.title,
        //   week_number: questaoRecente.week_number,
        //   year: questaoRecente.year,
        // });

        // Usar a questão mais recente
        const questoesSemanais = questaoRecente;
        
        // Buscar as questões associadas ao concurso da questão semanal
        let questoes = [];
        if (questoesSemanais.concurso_id) {
          const { data: questoesData, error: questoesError } = await supabase
            .from('simulado_questions')
            .select('*')
            .eq('concurso_id', questoesSemanais.concurso_id)
            .eq('deleted_at', null)
            .order('question_number', { ascending: true })
            .limit(10);

          if (questoesError) {
            // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
            // logger.error('Erro ao buscar questões:', {
            //   error: questoesError.message || String(questoesError),
            //   code: questoesError.code,
            //   concursoId: questoesSemanais.concurso_id,
            // });
          } else {
            questoes = questoesData || [];
            // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
            // logger.info('Questões encontradas para questão semanal recente:', {
            //   count: questoes.length,
            //   concursoId: questoesSemanais.concurso_id,
            // });
          }
        }

        // Buscar histórico do usuário
        const { data: historico, error: historicoError } = await supabase
          .from('user_questoes_semanais_progress')
          .select(`
            id,
            questoes_semanais_id,
            score,
            total_questions,
            completed_at
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (historicoError) {
          // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
          // logger.error('Erro ao buscar histórico:', {
          //   error: historicoError.message || String(historicoError),
          //   code: historicoError.code,
          //   userId: user.id,
          // });
        }

        // Buscar detalhes das questões semanais do histórico
        const historicoFormatted = [];
        if (historico && historico.length > 0) {
          const questoesSemanaisIds = historico.map(item => item.questoes_semanais_id);
          
          const { data: questoesSemanaisHistorico, error: historicoDetalhesError } = await supabase
            .from('questoes_semanais')
            .select('id, title, description, week_number, year')
            .in('id', questoesSemanaisIds);

          if (historicoDetalhesError) {
            // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
            // logger.error('Erro ao buscar detalhes do histórico:', {
            //   error: historicoDetalhesError.message || String(historicoDetalhesError),
            //   code: historicoDetalhesError.code,
            // });
          }

          const questoesSemanaisMap = new Map();
          questoesSemanaisHistorico?.forEach(qs => {
            questoesSemanaisMap.set(qs.id, qs);
          });

          historicoFormatted.push(...historico.map(item => {
            const questoesSemanal = questoesSemanaisMap.get(item.questoes_semanais_id);
            return {
              id: item.id,
              title: questoesSemanal?.title || 'Questão Semanal',
              description: questoesSemanal?.description || '',
              week_number: questoesSemanal?.week_number || 0,
              year: questoesSemanal?.year || 0,
              score: item.score,
              total_questions: item.total_questions,
              completed_at: item.completed_at,
            };
          }));
        }

        return NextResponse.json({
          questoesSemanal: questoesSemanais,
          questoes,
          alreadyCompleted: false,
          progress: null,
          historico: historicoFormatted,
          isRecentQuestion: true,
        });
      }

      // Se não há nenhuma questão semanal no banco
      return NextResponse.json({
        message: 'Não há questões disponíveis para esta semana',
        weekNumber,
        year: now.getFullYear(),
        questoesSemanal: null,
        questoes: [],
        historico: [],
        isRecentQuestion: false,
      });
    }

    // Verificar se o usuário já respondeu as questões desta semana
    const { data: progress, error: progressError } = await supabase
      .from('user_questoes_semanais_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('questoes_semanais_id', questoesSemanais.id)
      .maybeSingle();

    if (progressError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao verificar progresso:', {
      //   error: progressError.message || String(progressError),
      //   code: progressError.code,
      //   userId: user.id,
      //   questoesSemanaisId: questoesSemanais.id,
      // });
    }

    // Buscar as questões associadas ao concurso da questão semanal
    let questoes = [];
    if (questoesSemanais.concurso_id) {
      const { data: questoesData, error: questoesError } = await supabase
        .from('simulado_questions')
        .select('*')
        .eq('concurso_id', questoesSemanais.concurso_id)
        .eq('deleted_at', null)
        .order('question_number', { ascending: true })
        .limit(10); // Limitar a 10 questões por semana

      if (questoesError) {
        // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
        // logger.error('Erro ao buscar questões:', {
        //   error: questoesError.message || String(questoesError),
        //   code: questoesError.code,
        //   concursoId: questoesSemanais.concurso_id,
        // });
      } else {
        questoes = questoesData || [];
        // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
        // logger.info('Questões encontradas:', {
        //   count: questoes.length,
        //   concursoId: questoesSemanais.concurso_id,
        // });
      }
    }

    // Buscar histórico do usuário
    const { data: historico, error: historicoError } = await supabase
      .from('user_questoes_semanais_progress')
      .select(`
        id,
        questoes_semanais_id,
        score,
        total_questions,
        completed_at
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (historicoError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar histórico:', {
      //   error: historicoError.message || String(historicoError),
      //   code: historicoError.code,
      //   userId: user.id,
      // });
    }

    // Buscar detalhes das questões semanais do histórico
    const historicoFormatted = [];
    if (historico && historico.length > 0) {
      const questoesSemanaisIds = historico.map(item => item.questoes_semanais_id);
      
      const { data: questoesSemanaisHistorico, error: historicoDetalhesError } = await supabase
        .from('questoes_semanais')
        .select('id, title, description, week_number, year')
        .in('id', questoesSemanaisIds);

      if (historicoDetalhesError) {
        // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
        // logger.error('Erro ao buscar detalhes do histórico:', {
        //   error: historicoDetalhesError.message || String(historicoDetalhesError),
        //   code: historicoDetalhesError.code,
        // });
      }

      const questoesSemanaisMap = new Map();
      questoesSemanaisHistorico?.forEach(qs => {
        questoesSemanaisMap.set(qs.id, qs);
      });

      historicoFormatted.push(...historico.map(item => {
        const questoesSemanal = questoesSemanaisMap.get(item.questoes_semanais_id);
        return {
          id: item.id,
          title: questoesSemanal?.title || 'Questão Semanal',
          description: questoesSemanal?.description || '',
          week_number: questoesSemanal?.week_number || 0,
          year: questoesSemanal?.year || 0,
          score: item.score,
          total_questions: item.total_questions,
          completed_at: item.completed_at,
        };
      }));
    }

    return NextResponse.json({
      questoesSemanal: questoesSemanais,
      questoes,
      alreadyCompleted: !!progress,
      progress,
      historico: historicoFormatted,
      isRecentQuestion: false,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição:', {
    //   error: error instanceof Error ? error.message : String(error),
    //   stack: error instanceof Error ? error.stack : undefined,
    // });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
