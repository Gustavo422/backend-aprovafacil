// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const { searchParams } = new URL(_request.url);
  const categoriaId = searchParams.get('categoria_id');
  const ano = searchParams.get('ano');
  const banca = searchParams.get('banca');
  const isActive = searchParams.get('is_active');

  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let query = supabase
      .from('concursos')
      .select('*, concurso_categorias(*)');

    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    if (ano) {
      query = query.eq('ano', parseInt(ano));
    }

    if (banca) {
      query = query.eq('banca', banca);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao buscar concursos:', {
      //   error: error instanceof Error ? error.message : String(error),
      // });
      return NextResponse.json(
        { error: 'Erro interno ao buscar concursos.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição GET /api/concursos:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request) {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await _request.json();
    const { nome, descricao, categoria_id, ano, banca, is_active, edital_url, data_prova, vagas, salario } = body;

    if (!nome || !categoria_id) {
      return NextResponse.json(
        { error: 'Nome e categoria_id são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('concursos')
      .insert({
        nome,
        descricao,
        categoria_id,
        ano: ano ? parseInt(ano) : null,
        banca,
        is_active: is_active !== undefined ? is_active : true,
        edital_url,
        data_prova,
        vagas,
        salario
      })
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug
        )
      `)
      .single();

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao criar concurso:', {
      //   error: error instanceof Error ? error.message : String(error),
      // });
      return NextResponse.json(
        { error: 'Erro interno ao criar concurso.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Concurso criado com sucesso',
      data,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição POST /api/concursos:', {
    //   error: error instanceof Error ? error.message : String(error),
    // });
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
*/
