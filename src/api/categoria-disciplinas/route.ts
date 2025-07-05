// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

// ========================================
// GET - Buscar disciplinas
// ========================================

export async function GET(_request: Request) {
  const { searchParams } = new URL(_request.url);
  const categoriaId = searchParams.get('categoria_id');
  const isActive = searchParams.get('is_active');

  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Construir query base
    let query = supabase.from('categoria_disciplinas').select('*');

    // Aplicar filtros
    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Executar query
    const { data: disciplinas, error } = await query.order('ordem', { ascending: true });

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar disciplinas:', {
      //   error: error.message,
      //   userId: user.id,
      //   categoriaId,
      // });
      return NextResponse.json(
        { error: 'Erro ao buscar disciplinas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: disciplinas || [],
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro interno:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ========================================
// POST - Criar disciplina (apenas admin)
// ========================================

export async function POST(request: Request) {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // TODO: Verificar se o usuário é admin
    // Por enquanto, permitir criação para qualquer usuário autenticado

    // Obter dados da requisição
    const body = await request.json();
    const { categoria_id, nome, peso, horas_semanais, ordem } = body;

    // Validar dados obrigatórios
    if (!categoria_id || !nome || !peso || !horas_semanais || !ordem) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar peso (1-100)
    if (peso < 1 || peso > 100) {
      return NextResponse.json(
        { error: 'Peso deve estar entre 1 e 100' },
        { status: 400 }
      );
    }

    // Validar horas semanais
    if (horas_semanais < 1) {
      return NextResponse.json(
        { error: 'Horas semanais deve ser maior que 0' },
        { status: 400 }
      );
    }

    // Verificar se a categoria existe
    const { data: categoria, error: categoriaError } = await supabase
      .from('concurso_categorias')
      .select('id')
      .eq('id', categoria_id)
      .eq('is_active', true)
      .single();

    if (categoriaError || !categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada ou inativa' },
        { status: 404 }
      );
    }

    // Verificar se já existe disciplina com o mesmo nome na categoria
    const { data: existingDisciplina, error: existingError } = await supabase
      .from('categoria_disciplinas')
      .select('id')
      .eq('categoria_id', categoria_id)
      .eq('nome', nome)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao verificar disciplina existente:', {
      //   error: existingError.message,
      //   categoriaId: categoria_id,
      //   nome,
      // });
      return NextResponse.json(
        { error: 'Erro ao verificar disciplina existente' },
        { status: 500 }
      );
    }

    if (existingDisciplina) {
      return NextResponse.json(
        { error: 'Disciplina já existe nesta categoria' },
        { status: 409 }
      );
    }

    // Criar disciplina
    const { data: disciplina, error } = await supabase
      .from('categoria_disciplinas')
      .insert({
        categoria_id,
        nome,
        peso,
        horas_semanais,
        ordem,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao criar disciplina:', {
      //   error: error.message,
      //   userId: user.id,
      //   categoriaId: categoria_id,
      //   nome,
      // });
      return NextResponse.json(
        { error: 'Erro ao criar disciplina' },
        { status: 500 }
      );
    }

    // Log da ação
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.info('Disciplina criada:', {
    //   userId: user.id,
    //   disciplinaId: disciplina.id,
    //   categoriaId: categoria_id,
    //   nome,
    //   peso,
    //   horas_semanais,
    // });

    return NextResponse.json({
      message: 'Disciplina criada com sucesso',
      disciplina,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro interno:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
