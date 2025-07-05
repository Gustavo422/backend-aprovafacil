// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';

interface Concurso {
  id: string;
  nome: string;
  categoria: string;
  ano: number;
  banca: string;
}

interface Simulado {
  id: string;
  titulo: string;
  descricao: string | null;
  tempo_limite_minutos: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  is_publico: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string;
  concursos?: Concurso[];
}

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  // TODO: Refatorar para backend puro. Removido código dependente de frontend/SSR/Next.js.
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar simulados personalizados com join para concursos
    const { data: simulados, error } = await supabase
      .from('simulados-personalizados')
      .select(`
        *,
        concursos (
          id,
          nome,
          categoria,
          ano,
          banca
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulados:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar simulados' },
        { status: 500 }
      );
    }

    // Type assertion para garantir a tipagem correta
    const simuladosData = (simulados || []) as Simulado[];

    return NextResponse.json({
      data: simuladosData,
      count: simuladosData.length,
      page: 1,
      limit: 10,
    });
  } catch (error) {
    console.error('Erro na rota de simulados:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
