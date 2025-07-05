// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const { searchParams } = new URL(_request.url);
  const disciplina = searchParams.get('disciplina');

  // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
  // const supabase = await createRouteHandlerClient();

  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Construir a query base
    let query = supabase
      .from('user_discipline_stats')
      .select('*')
      .eq('user_id', user.id);

    // Aplicar filtro por disciplina se fornecido
    if (disciplina) {
      query = query.eq('disciplina', disciplina);
    }

    // Executar a query
    const { data: estatisticas, error } = await query;

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar estatísticas:', {
      //   error: error instanceof Error ? error.message : String(error),
      // });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      estatisticas,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request) {
  // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
  // const supabase = await createRouteHandlerClient();

  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter os dados do corpo da requisição
    const body = await _request.json();
    const { disciplina, total_questions, correct_answers, study_time_minutes } =
      body;

    // Validar os dados obrigatórios
    if (!disciplina) {
      return NextResponse.json(
        { error: 'Disciplina é obrigatória' },
        { status: 400 }
      );
    }

    // Calcular a média de acertos
    const average_score =
      total_questions > 0 ? (correct_answers / total_questions) * 100 : 0;

    // Buscar estatísticas existentes
    const { data: statsExistentes, error: buscaError } = await supabase
      .from('user_discipline_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('disciplina', disciplina)
      .maybeSingle();

    if (buscaError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar estatísticas existentes:', {
      //   error: buscaError instanceof Error ? buscaError.message : String(buscaError),
      // });
      return NextResponse.json(
        { error: buscaError instanceof Error ? buscaError.message : String(buscaError) },
        { status: 500 }
      );
    }

    // Atualizar ou criar estatísticas
    const { data, error } = await supabase
      .from('user_discipline_stats')
      .upsert({
        user_id: user.id,
        disciplina,
        total_questions: statsExistentes
          ? statsExistentes.total_questions + (total_questions || 0)
          : total_questions || 0,
        correct_answers: statsExistentes
          ? statsExistentes.correct_answers + (correct_answers || 0)
          : correct_answers || 0,
        average_score: statsExistentes
          ? ((statsExistentes.correct_answers + (correct_answers || 0)) /
              (statsExistentes.total_questions + (total_questions || 0))) *
            100
          : average_score,
        study_time_minutes: statsExistentes
          ? statsExistentes.study_time_minutes + (study_time_minutes || 0)
          : study_time_minutes || 0,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao atualizar estatísticas:', {
      //   error: error instanceof Error ? error.message : String(error),
      // });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Estatísticas atualizadas com sucesso',
      data,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
*/
