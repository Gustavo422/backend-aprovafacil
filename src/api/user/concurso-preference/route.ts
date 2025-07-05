// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

// ========================================
// GET - Buscar preferência do usuário
// ========================================

export async function GET(_request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar preferência ativa do usuário
    const { data: preference, error } = await supabase
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhuma preferência encontrada
        return NextResponse.json({ error: 'Preferência não encontrada' }, { status: 404 });
      }
      
      logger.error('Erro ao buscar preferência do usuário:', {
        error: error.message,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Erro ao buscar preferência' },
        { status: 500 }
      );
    }

    // Calcular se pode trocar de concurso
    const now = new Date();
    const canChangeUntil = new Date(preference.can_change_until);
    const canChange = now >= canChangeUntil;
    const daysUntilChange = Math.max(0, Math.ceil((canChangeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      data: preference,
      canChange,
      daysUntilChange,
    });
  } catch (error) {
    logger.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ========================================
// POST - Criar/Atualizar preferência do usuário
// ========================================

export async function POST(request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter dados da requisição
    const body = await request.json();
    const { concurso_id } = body;

    if (!concurso_id) {
      return NextResponse.json(
        { error: 'ID do concurso é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o concurso existe e está ativo
    const { data: concurso, error: concursoError } = await supabase
      .from('concursos')
      .select('*')
      .eq('id', concurso_id)
      .eq('is_active', true)
      .single();

    if (concursoError || !concurso) {
      return NextResponse.json(
        { error: 'Concurso não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se já existe uma preferência ativa
    const { data: existingPreference, error: existingError } = await supabase
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('Erro ao verificar preferência existente:', {
        error: existingError.message,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Erro ao verificar preferência existente' },
        { status: 500 }
      );
    }

    // Calcular data de troca permitida (4 meses)
    const now = new Date();
    const canChangeUntil = new Date(now.getTime() + (4 * 30 * 24 * 60 * 60 * 1000)); // 4 meses

    if (existingPreference) {
      // Verificar se pode trocar de concurso
      const canChange = now >= new Date(existingPreference.can_change_until);
      
      if (!canChange) {
        const daysUntilChange = Math.ceil(
          (new Date(existingPreference.can_change_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return NextResponse.json({
          error: 'Você só pode trocar de concurso após 4 meses',
          daysUntilChange,
          canChangeUntil: existingPreference.can_change_until,
        }, { status: 403 });
      }

      // Desativar preferência atual
      const { error: deactivateError } = await supabase
        .from('user_concurso_preferences')
        .update({ is_active: false })
        .eq('id', existingPreference.id);

      if (deactivateError) {
        logger.error('Erro ao desativar preferência existente:', {
          error: deactivateError.message,
          preferenceId: existingPreference.id,
        });
        return NextResponse.json(
          { error: 'Erro ao atualizar preferência' },
          { status: 500 }
        );
      }
    }

    // Criar nova preferência
    const { data: newPreference, error: createError } = await supabase
      .from('user_concurso_preferences')
      .insert({
        user_id: user.id,
        concurso_id: concurso_id,
        can_change_until: canChangeUntil.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Erro ao criar preferência:', {
        error: createError.message,
        userId: user.id,
        concursoId: concurso_id,
      });
      return NextResponse.json(
        { error: 'Erro ao criar preferência' },
        { status: 500 }
      );
    }

    // Log da ação
    logger.info('Preferência de concurso criada/atualizada:', {
      userId: user.id,
      concursoId: concurso_id,
      canChangeUntil: canChangeUntil.toISOString(),
    });

    return NextResponse.json({
      message: 'Preferência de concurso definida com sucesso',
      data: newPreference,
      canChange: false,
      daysUntilChange: 120, // 4 meses
    });
  } catch (error) {
    logger.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ========================================
// PUT - Atualizar preferência (para troca após 4 meses)
// ========================================

export async function PUT(request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter dados da requisição
    const body = await request.json();
    const { concurso_id } = body;

    if (!concurso_id) {
      return NextResponse.json(
        { error: 'ID do concurso é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o concurso existe e está ativo
    const { data: concurso, error: concursoError } = await supabase
      .from('concursos')
      .select('*')
      .eq('id', concurso_id)
      .eq('is_active', true)
      .single();

    if (concursoError || !concurso) {
      return NextResponse.json(
        { error: 'Concurso não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Buscar preferência atual
    const { data: currentPreference, error: currentError } = await supabase
      .from('user_concurso_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (currentError || !currentPreference) {
      return NextResponse.json(
        { error: 'Nenhuma preferência ativa encontrada' },
        { status: 404 }
      );
    }

    // Verificar se pode trocar
    const now = new Date();
    const canChange = now >= new Date(currentPreference.can_change_until);

    if (!canChange) {
      const daysUntilChange = Math.ceil(
        (new Date(currentPreference.can_change_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return NextResponse.json({
        error: 'Você só pode trocar de concurso após 4 meses',
        daysUntilChange,
        canChangeUntil: currentPreference.can_change_until,
      }, { status: 403 });
    }

    // Calcular nova data de troca permitida
    const newCanChangeUntil = new Date(now.getTime() + (4 * 30 * 24 * 60 * 60 * 1000));

    // Atualizar preferência
    const { data: updatedPreference, error: updateError } = await supabase
      .from('user_concurso_preferences')
      .update({
        concurso_id: concurso_id,
        can_change_until: newCanChangeUntil.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', currentPreference.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Erro ao atualizar preferência:', {
        error: updateError.message,
        preferenceId: currentPreference.id,
      });
      return NextResponse.json(
        { error: 'Erro ao atualizar preferência' },
        { status: 500 }
      );
    }

    // Log da ação
    logger.info('Preferência de concurso atualizada:', {
      userId: user.id,
      oldConcursoId: currentPreference.concurso_id,
      newConcursoId: concurso_id,
      newCanChangeUntil: newCanChangeUntil.toISOString(),
    });

    return NextResponse.json({
      message: 'Preferência de concurso atualizada com sucesso',
      data: updatedPreference,
      canChange: false,
      daysUntilChange: 120, // 4 meses
    });
  } catch (error) {
    logger.error('Erro interno:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
