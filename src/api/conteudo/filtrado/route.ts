// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
// TODO: Corrigir import de '@/types/concurso' para caminho relativo ou remover se não for usado.
// import { ConteudoFiltradoResponse } from '@/types/concurso';
import { NextResponse } from 'next/server';

// ========================================
// GET - Buscar conteúdo filtrado
// ========================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Parâmetros obrigatórios
  const categoriaId = searchParams.get('categoria_id');
  const concursoId = searchParams.get('concurso_id');
  
  // Parâmetros opcionais
  const disciplina = searchParams.get('disciplina');
  const dificuldade = searchParams.get('dificuldade');
  const isPublic = searchParams.get('is_public');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // TODO: Corrigir referências a supabase, logger e tipos para evitar erros de compilação.
    // const supabase = await createRouteHandlerClient();

    // Verificar se o usuário está autenticado
    // const {
    //   data: { user },
    // } = await supabase.auth.getUser();

    // if (!user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    // }

    // Validar parâmetros obrigatórios
    if (!categoriaId || !concursoId) {
      return NextResponse.json(
        { error: 'categoria_id e concurso_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // ========================================
    // BUSCAR SIMULADOS
    // ========================================

    let simuladosQuery = supabase
      .from('simulados_personalizados')
      .select(`
        *,
        concursos (
          *,
          concurso_categorias (*)
        )
      `)
      .eq('categoria_id', categoriaId)
      .eq('concurso_id', concursoId)
      .is('deleted_at', null);

    if (isPublic !== null) {
      simuladosQuery = simuladosQuery.eq('is_public', isPublic === 'true');
    }

    const { data: simulados, error: simuladosError } = await simuladosQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (simuladosError) {
      console.error('Erro ao buscar simulados:', {
        error: simuladosError.message,
        userId: user.id,
        categoriaId,
        concursoId,
      });
    }

    // ========================================
    // BUSCAR FLASHCARDS
    // ========================================

    let cartoesQuery = supabase
      .from('cartoes_memorizacao')
      .select(`
        *,
        concursos (
          *,
          concurso_categorias (*)
        )
      `)
      .eq('categoria_id', categoriaId)
      .eq('concurso_id', concursoId);

    if (disciplina) {
      cartoesQuery = cartoesQuery.eq('disciplina', disciplina);
    }

    const { data: cartoes, error: cartoesError } = await cartoesQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (cartoesError) {
      console.error('Erro ao buscar cartões de memorização:', {
        error: cartoesError.message,
        userId: user.id,
        categoriaId,
        concursoId,
      });
    }

    // ========================================
    // BUSCAR APOSTILAS
    // ========================================

    const apostilasQuery = supabase
      .from('apostilas')
      .select(`
        *,
        concursos (
          *,
          concurso_categorias (*)
        )
      `)
      .eq('categoria_id', categoriaId)
      .eq('concurso_id', concursoId);

    const { data: apostilas, error: apostilasError } = await apostilasQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (apostilasError) {
      console.error('Erro ao buscar apostilas:', {
        error: apostilasError.message,
        userId: user.id,
        categoriaId,
        concursoId,
      });
    }

    // ========================================
    // BUSCAR MAPA DE ASSUNTOS
    // ========================================

    let mapaAssuntosQuery = supabase
      .from('mapa_assuntos')
      .select(`
        *,
        concursos (
          *,
          concurso_categorias (*)
        )
      `)
      .eq('categoria_id', categoriaId)
      .eq('concurso_id', concursoId);

    if (disciplina) {
      mapaAssuntosQuery = mapaAssuntosQuery.eq('disciplina', disciplina);
    }

    const { data: mapaAssuntos, error: mapaAssuntosError } = await mapaAssuntosQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (mapaAssuntosError) {
      logger.error('Erro ao buscar mapa de assuntos:', {
        error: mapaAssuntosError.message,
        userId: user.id,
        categoriaId,
        concursoId,
      });
    }

    // ========================================
    // CONTAR TOTAL DE ITENS
    // ========================================

    const [
      { count: totalSimulados },
      { count: totalFlashcards },
      { count: totalApostilas },
      { count: totalMapaAssuntos }
    ] = await Promise.all([
      supabase
        .from('simulados_personalizados')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', categoriaId)
        .eq('concurso_id', concursoId)
        .is('deleted_at', null),
      supabase
        .from('cartoes_memorizacao')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', categoriaId)
        .eq('concurso_id', concursoId),
      supabase
        .from('apostilas')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', categoriaId)
        .eq('concurso_id', concursoId),
      supabase
        .from('mapa_assuntos')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', categoriaId)
        .eq('concurso_id', concursoId)
    ]);

    const total = (totalSimulados || 0) + (totalFlashcards || 0) + (totalApostilas || 0) + (totalMapaAssuntos || 0);

    // ========================================
    // MONTAR RESPOSTA
    // ========================================

    const response: ConteudoFiltradoResponse = {
      data: {
        simulados: simulados || [],
        flashcards: cartoes || [],
        apostilas: apostilas || [],
        mapaAssuntos: mapaAssuntos || [],
      },
      total,
      page,
      limit,
    };

    // Log da consulta
    console.log('Conteúdo filtrado consultado:', {
      userId: user.id,
      categoriaId,
      concursoId,
      disciplina,
      dificuldade,
      totalSimulados: simulados?.length || 0,
      totalFlashcards: cartoes?.length || 0,
      totalApostilas: apostilas?.length || 0,
      totalMapaAssuntos: mapaAssuntos?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro interno ao buscar conteúdo filtrado:', {
      error: error instanceof Error ? error.message : String(error),
      categoriaId,
      concursoId,
    });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
