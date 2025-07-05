// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
  // const supabase = await createRouteHandlerClient();

  try {
    // Verificar se o usuário está autenticado
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const {
    //   data: { user },
    // } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter os dados do corpo da requisição
    const body = await request.json();
    const { assuntoId, status } = body;

    // Validar os dados
    if (!assuntoId || !status) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Validar o status
    const statusValidos = [
      'estudado',
      'a_revisar',
      'nao_sei_nada',
      'nao_estudado',
    ];
    if (!statusValidos.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Atualizar o status do assunto
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const { data, error } = await supabase
    //   .from('user_mapa_assuntos_status')
    //   .upsert({
    //     user_id: user.id,
    //     mapa_assunto_id: assuntoId,
    //     status,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .select();

    if (error) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao atualizar status:', { error });
      return NextResponse.json(
        { error: 'Erro ao atualizar status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      data,
    });
  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao processar requisição:', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
*/
