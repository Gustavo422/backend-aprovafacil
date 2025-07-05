// Script de teste para o sistema de concursos
// Execute: node scripts/test-concurso-system.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConcursoSystem() {
  console.log('🧪 Testando Sistema de Concursos...\n');

  try {
    // ========================================
    // 1. Testar Tabelas de Categorias
    // ========================================
    console.log('1️⃣ Testando tabelas de categorias...');
    
    const { data: categorias, error: categoriasError } = await supabase
      .from('concurso_categorias')
      .select('*')
      .limit(5);
    
    if (categoriasError) {
      console.error('❌ Erro ao buscar categorias:', categoriasError.message);
    } else {
      console.log(`✅ Categorias encontradas: ${categorias?.length || 0}`);
      if (categorias && categorias.length > 0) {
        console.log('   Primeira categoria:', categorias[0].nome);
      }
    }

    // ========================================
    // 2. Testar Tabela de Concursos
    // ========================================
    console.log('\n2️⃣ Testando tabela de concursos...');
    
    const { data: concursos, error: concursosError } = await supabase
      .from('concursos')
      .select('*, concurso_categorias(nome)')
      .limit(5);
    
    if (concursosError) {
      console.error('❌ Erro ao buscar concursos:', concursosError.message);
    } else {
      console.log(`✅ Concursos encontrados: ${concursos?.length || 0}`);
      if (concursos && concursos.length > 0) {
        console.log('   Primeiro concurso:', concursos[0].nome);
        console.log('   Categoria:', concursos[0].concurso_categorias?.nome || 'N/A');
      }
    }

    // ========================================
    // 3. Testar Tabela de Disciplinas
    // ========================================
    console.log('\n3️⃣ Testando tabela de disciplinas...');
    
    const { data: disciplinas, error: disciplinasError } = await supabase
      .from('categoria_disciplinas')
      .select('*, concurso_categorias(nome)')
      .limit(5);
    
    if (disciplinasError) {
      console.error('❌ Erro ao buscar disciplinas:', disciplinasError.message);
    } else {
      console.log(`✅ Disciplinas encontradas: ${disciplinas?.length || 0}`);
      if (disciplinas && disciplinas.length > 0) {
        console.log('   Primeira disciplina:', disciplinas[0].nome);
        console.log('   Categoria:', disciplinas[0].concurso_categorias?.nome || 'N/A');
      }
    }

    // ========================================
    // 4. Testar Tabela de Preferências
    // ========================================
    console.log('\n4️⃣ Testando tabela de preferências...');
    
    const { data: preferencias, error: preferenciasError } = await supabase
      .from('user_concurso_preferences')
      .select('*, concursos(nome), users(email)')
      .limit(5);
    
    if (preferenciasError) {
      console.error('❌ Erro ao buscar preferências:', preferenciasError.message);
    } else {
      console.log(`✅ Preferências encontradas: ${preferencias?.length || 0}`);
      if (preferencias && preferencias.length > 0) {
        console.log('   Primeira preferência:', preferencias[0].concursos?.nome || 'N/A');
        console.log('   Usuário:', preferencias[0].users?.email || 'N/A');
      }
    }

    // ========================================
    // 5. Testar Conteúdo Filtrado
    // ========================================
    console.log('\n5️⃣ Testando conteúdo filtrado...');
    
    // Buscar simulados com categoria
    const { data: simulados, error: simuladosError } = await supabase
      .from('simulados')
      .select('*, concurso_categorias(nome)')
      .not('categoria_id', 'is', null)
      .limit(5);
    
    if (simuladosError) {
      console.error('❌ Erro ao buscar simulados:', simuladosError.message);
    } else {
      console.log(`✅ Simulados com categoria: ${simulados?.length || 0}`);
      if (simulados && simulados.length > 0) {
        console.log('   Primeiro simulado:', simulados[0].title);
        console.log('   Categoria:', simulados[0].concurso_categorias?.nome || 'N/A');
      }
    }

    // ========================================
    // 6. Testar Índices
    // ========================================
    console.log('\n6️⃣ Testando performance...');
    
    const startTime = Date.now();
    const { data: concursosRapidos, error: concursosRapidosError } = await supabase
      .from('concursos')
      .select('id, nome, categoria_id')
      .eq('is_active', true)
      .limit(100);
    const endTime = Date.now();
    
    if (concursosRapidosError) {
      console.error('❌ Erro no teste de performance:', concursosRapidosError.message);
    } else {
      console.log(`✅ Query executada em ${endTime - startTime}ms`);
      console.log(`   Concursos retornados: ${concursosRapidos?.length || 0}`);
    }

    // ========================================
    // 7. Resumo Final
    // ========================================
    console.log('\n🎉 Resumo dos Testes:');
    console.log('=====================');
    
    const resultados = {
      categorias: categorias?.length || 0,
      concursos: concursos?.length || 0,
      disciplinas: disciplinas?.length || 0,
      preferencias: preferencias?.length || 0,
      simulados: simulados?.length || 0,
      performance: endTime - startTime
    };
    
    console.log(`📊 Categorias: ${resultados.categorias}`);
    console.log(`📊 Concursos: ${resultados.concursos}`);
    console.log(`📊 Disciplinas: ${resultados.disciplinas}`);
    console.log(`📊 Preferências: ${resultados.preferencias}`);
    console.log(`📊 Simulados com categoria: ${resultados.simulados}`);
    console.log(`⚡ Performance: ${resultados.performance}ms`);
    
    // Verificar se há dados suficientes
    if (resultados.categorias === 0) {
      console.log('\n⚠️  AVISO: Nenhuma categoria encontrada!');
      console.log('   Execute o script de inserção de dados primeiro.');
    }
    
    if (resultados.concursos === 0) {
      console.log('\n⚠️  AVISO: Nenhum concurso encontrado!');
      console.log('   Execute o script de inserção de dados primeiro.');
    }
    
    console.log('\n✅ Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar testes
testConcursoSystem(); 