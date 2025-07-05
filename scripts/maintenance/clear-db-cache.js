const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function clearDatabaseCache() {
  console.log('🗄️  Conectando ao banco de dados...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas');
    console.log('Certifique-se de que o arquivo .env.local existe com:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🧹 Limpando cache do banco de dados...');
    
    // 1. Limpar cache expirado
    const { error: expiredError } = await supabase
      .from('user_performance_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (expiredError) {
      console.error('❌ Erro ao limpar cache expirado:', expiredError.message);
    } else {
      console.log('✅ Cache expirado limpo');
    }

    // 2. Limpar todo o cache (opcional - descomente se necessário)
    // const { error: allError } = await supabase
    //   .from('user_performance_cache')
    //   .delete()
    //   .neq('id', '');
    
    // if (allError) {
    //   console.error('❌ Erro ao limpar todo o cache:', allError.message);
    // } else {
    //   console.log('✅ Todo o cache limpo');
    // }

    // 3. Verificar estatísticas
    const { data: cacheStats, error: statsError } = await supabase
      .from('user_performance_cache')
      .select('id', { count: 'exact' });

    if (statsError) {
      console.error('❌ Erro ao verificar estatísticas:', statsError.message);
    } else {
      console.log(`📊 Cache restante: ${cacheStats?.length || 0} entradas`);
    }

    console.log('🎉 Limpeza do cache do banco concluída!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  clearDatabaseCache();
}

module.exports = { clearDatabaseCache }; 