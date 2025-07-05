// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

// ========================================
// GET - Buscar categorias
// ========================================

export async function GET(_request: Request) {
  const { searchParams } = new URL(_request.url);
  const isActive = searchParams.get('is_active');
  const slug = searchParams.get('slug');

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
    let query = supabase.from('concurso_categorias').select('*');

    // Aplicar filtros
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (slug) {
      query = query.eq('slug', slug);
    }

    // Executar query
    const { data: categorias, error } = await query.order('nome', { ascending: true });

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar categorias:', {
      //   error: error.message,
      //   userId: user.id,
      // });
      return NextResponse.json(
        { error: 'Erro ao buscar categorias' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: categorias || [],
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
// POST - Criar categoria (apenas admin)
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
    const { nome, slug, descricao, cor_primaria, cor_secundaria } = body;

    // Validar dados obrigatórios
    if (!nome || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o slug já existe
    const { data: existingCategoria, error: existingError } = await supabase
      .from('concurso_categorias')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao verificar slug existente:', {
      //   error: existingError.message,
      //   slug,
      // });
      return NextResponse.json(
        { error: 'Erro ao verificar slug existente' },
        { status: 500 }
      );
    }

    if (existingCategoria) {
      return NextResponse.json(
        { error: 'Slug já existe' },
        { status: 409 }
      );
    }

    // Criar categoria
    const { data: categoria, error } = await supabase
      .from('concurso_categorias')
      .insert({
        nome,
        slug,
        descricao,
        cor_primaria: cor_primaria || '#2563EB',
        cor_secundaria: cor_secundaria || '#1E40AF',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao criar categoria:', {
      //   error: error.message,
      //   userId: user.id,
      //   nome,
      //   slug,
      // });
      return NextResponse.json(
        { error: 'Erro ao criar categoria' },
        { status: 500 }
      );
    }

    // Log da ação
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.info('Categoria criada:', {
    //   userId: user.id,
    //   categoriaId: categoria.id,
    //   nome,
    //   slug,
    // });

    return NextResponse.json({
      message: 'Categoria criada com sucesso',
      categoria,
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
