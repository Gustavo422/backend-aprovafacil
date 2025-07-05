// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';
// TODO: Corrigir import de '@/src/core/database/repositories/simulados-repository' para caminho relativo ou remover se não for usado.
// import { SimuladosRepository } from '@/src/core/database/repositories/simulados-repository';
// TODO: Corrigir import de '@/src/features/simulados/services/simulados-service' para caminho relativo ou remover se não for usado.
// import { SimuladosService } from '@/src/features/simulados/services/simulados-service';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Usar o serviço refatorado
    const repository = new SimuladosRepository(supabase);
    const simuladosService = new SimuladosService(repository);
    const page = 1;
    const limit = 10;
    const filters = {}; // Filtros adicionais podem ser adicionados aqui
    const result = await simuladosService.getSimulados(page, limit, filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar simulados:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        // Incluir mensagem de erro apenas em ambiente de desenvolvimento
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) })
      },
      { status: 500 }
    );
  }
}
*/
