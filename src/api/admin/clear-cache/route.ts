// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// import { createRouteHandlerClient } from '@/lib/supabase';
// const logger = ...;

export async function POST() {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();
    
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.info('Iniciando limpeza de cache do sistema');

    // Limpar cache de performance
    const { error: performanceError } = await supabase
      .from('user_performance_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos exceto um registro dummy

    if (performanceError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao limpar cache de performance', { error: performanceError });
    } else {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.info('Cache de performance limpo com sucesso');
    }

    // Limpar cache de configuração
    const { error: configError } = await supabase
      .from('cache_config')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (configError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao limpar cache de configuração', { error: configError });
    } else {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.info('Cache de configuração limpo com sucesso');
    }

    // Limpar cache de estatísticas de disciplina
    const { error: statsError } = await supabase
      .from('user_discipline_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (statsError) {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.error('Erro ao limpar estatísticas de disciplina', { error: statsError });
    } else {
      // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
      // logger.info('Estatísticas de disciplina limpas com sucesso');
    }

    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.info('Limpeza de cache concluída');

    return NextResponse.json({
      success: true,
      message: 'Cache do sistema limpo com sucesso',
      details: {
        performanceCache: !performanceError,
        configCache: !configError,
        disciplineStats: !statsError
      }
    });

  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro inesperado ao limpar cache', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'CACHE_CLEAR_FAILED', 
          message: 'Erro ao limpar cache do sistema' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();
    
    // Obter estatísticas do cache
    const { count: performanceCount, error: performanceError } = await supabase
      .from('user_performance_cache')
      .select('*', { count: 'exact', head: true });

    const { count: configCount, error: configError } = await supabase
      .from('cache_config')
      .select('*', { count: 'exact', head: true });

    const { count: disciplineCount, error: statsError } = await supabase
      .from('user_discipline_stats')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      cacheStats: {
        performanceCache: performanceError ? 0 : performanceCount || 0,
        configCache: configError ? 0 : configCount || 0,
        disciplineStats: statsError ? 0 : disciplineCount || 0
      }
    });

  } catch (error) {
    // TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
    // logger.error('Erro ao obter estatísticas do cache', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'CACHE_STATS_FAILED', 
          message: 'Erro ao obter estatísticas do cache' 
        } 
      },
      { status: 500 }
    );
  }
}
*/
