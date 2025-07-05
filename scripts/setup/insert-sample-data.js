// Script para inserir dados de exemplo no sistema de concursos
// Execute: node scripts/insert-sample-data.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSampleData() {
  console.log('🚀 Inserindo dados de exemplo...\n');

  try {
    // ========================================
    // 1. Inserir Categorias
    // ========================================
    console.log('1️⃣ Inserindo categorias...');
    
    const categorias = [
      {
        nome: 'Guarda Municipal',
        slug: 'guarda-municipal',
        descricao: 'Concursos para Guarda Municipal',
        cor_primaria: '#2563EB',
        cor_secundaria: '#1E40AF'
      },
      {
        nome: 'Polícia Civil',
        slug: 'policia-civil',
        descricao: 'Concursos para Polícia Civil',
        cor_primaria: '#DC2626',
        cor_secundaria: '#B91C1C'
      },
      {
        nome: 'Tribunais',
        slug: 'tribunais',
        descricao: 'Concursos para Tribunais',
        cor_primaria: '#059669',
        cor_secundaria: '#047857'
      },
      {
        nome: 'Receita Federal',
        slug: 'receita-federal',
        descricao: 'Concursos para Receita Federal',
        cor_primaria: '#7C3AED',
        cor_secundaria: '#6D28D9'
      },
      {
        nome: 'Banco do Brasil',
        slug: 'banco-brasil',
        descricao: 'Concursos para Banco do Brasil',
        cor_primaria: '#F59E0B',
        cor_secundaria: '#D97706'
      }
    ];

    const { data: categoriasInseridas, error: categoriasError } = await supabase
      .from('concurso_categorias')
      .insert(categorias)
      .select();

    if (categoriasError) {
      console.error('❌ Erro ao inserir categorias:', categoriasError.message);
      return;
    }

    console.log(`✅ ${categoriasInseridas.length} categorias inseridas`);

    // ========================================
    // 2. Inserir Disciplinas para cada categoria
    // ========================================
    console.log('\n2️⃣ Inserindo disciplinas...');

    const disciplinasPorCategoria = {
      'guarda-municipal': [
        { nome: 'Português', peso: 25, horas_semanais: 4, ordem: 1 },
        { nome: 'Matemática', peso: 25, horas_semanais: 4, ordem: 2 },
        { nome: 'Conhecimentos Gerais', peso: 30, horas_semanais: 5, ordem: 3 },
        { nome: 'Legislação Municipal', peso: 20, horas_semanais: 3, ordem: 4 }
      ],
      'policia-civil': [
        { nome: 'Português', peso: 20, horas_semanais: 3, ordem: 1 },
        { nome: 'Matemática', peso: 15, horas_semanais: 2, ordem: 2 },
        { nome: 'Direito Penal', peso: 25, horas_semanais: 5, ordem: 3 },
        { nome: 'Direito Processual Penal', peso: 20, horas_semanais: 4, ordem: 4 },
        { nome: 'Criminologia', peso: 20, horas_semanais: 3, ordem: 5 }
      ],
      'tribunais': [
        { nome: 'Português', peso: 15, horas_semanais: 2, ordem: 1 },
        { nome: 'Direito Constitucional', peso: 25, horas_semanais: 5, ordem: 2 },
        { nome: 'Direito Civil', peso: 20, horas_semanais: 4, ordem: 3 },
        { nome: 'Direito Processual Civil', peso: 20, horas_semanais: 4, ordem: 4 },
        { nome: 'Direito Penal', peso: 20, horas_semanais: 3, ordem: 5 }
      ],
      'receita-federal': [
        { nome: 'Português', peso: 15, horas_semanais: 2, ordem: 1 },
        { nome: 'Matemática', peso: 20, horas_semanais: 4, ordem: 2 },
        { nome: 'Direito Tributário', peso: 25, horas_semanais: 5, ordem: 3 },
        { nome: 'Direito Constitucional', peso: 20, horas_semanais: 4, ordem: 4 },
        { nome: 'Contabilidade', peso: 20, horas_semanais: 3, ordem: 5 }
      ],
      'banco-brasil': [
        { nome: 'Português', peso: 20, horas_semanais: 3, ordem: 1 },
        { nome: 'Matemática', peso: 25, horas_semanais: 5, ordem: 2 },
        { nome: 'Conhecimentos Bancários', peso: 30, horas_semanais: 6, ordem: 3 },
        { nome: 'Atualidades', peso: 15, horas_semanais: 2, ordem: 4 },
        { nome: 'Informática', peso: 10, horas_semanais: 2, ordem: 5 }
      ]
    };

    let totalDisciplinas = 0;
    for (const [slug, disciplinas] of Object.entries(disciplinasPorCategoria)) {
      const categoria = categoriasInseridas.find(c => c.slug === slug);
      if (categoria) {
        const disciplinasComCategoria = disciplinas.map(d => ({
          ...d,
          categoria_id: categoria.id
        }));

        const { data: disciplinasInseridas, error: disciplinasError } = await supabase
          .from('categoria_disciplinas')
          .insert(disciplinasComCategoria)
          .select();

        if (disciplinasError) {
          console.error(`❌ Erro ao inserir disciplinas para ${slug}:`, disciplinasError.message);
        } else {
          console.log(`✅ ${disciplinasInseridas.length} disciplinas inseridas para ${categoria.nome}`);
          totalDisciplinas += disciplinasInseridas.length;
        }
      }
    }

    // ========================================
    // 3. Inserir Concursos de Exemplo
    // ========================================
    console.log('\n3️⃣ Inserindo concursos...');

    const concursos = [
      {
        nome: 'Guarda Municipal de São Paulo 2024',
        categoria: 'Guarda Municipal',
        ano: 2024,
        banca: 'VUNESP',
        edital_url: 'https://exemplo.com/edital1',
        data_prova: '2024-06-15',
        vagas: 500,
        salario: 3500.00
      },
      {
        nome: 'Polícia Civil de São Paulo 2024',
        categoria: 'Polícia Civil',
        ano: 2024,
        banca: 'VUNESP',
        edital_url: 'https://exemplo.com/edital2',
        data_prova: '2024-07-20',
        vagas: 300,
        salario: 4500.00
      },
      {
        nome: 'Tribunal de Justiça de São Paulo 2024',
        categoria: 'Tribunais',
        ano: 2024,
        banca: 'VUNESP',
        edital_url: 'https://exemplo.com/edital3',
        data_prova: '2024-08-10',
        vagas: 100,
        salario: 8000.00
      },
      {
        nome: 'Receita Federal 2024',
        categoria: 'Receita Federal',
        ano: 2024,
        banca: 'CESPE/CEBRASPE',
        edital_url: 'https://exemplo.com/edital4',
        data_prova: '2024-09-05',
        vagas: 200,
        salario: 12000.00
      },
      {
        nome: 'Banco do Brasil 2024',
        categoria: 'Banco do Brasil',
        ano: 2024,
        banca: 'CESGRANRIO',
        edital_url: 'https://exemplo.com/edital5',
        data_prova: '2024-10-15',
        vagas: 1000,
        salario: 4000.00
      }
    ];

    // Mapear categorias para IDs
    const concursosComCategoria = concursos.map(concurso => {
      const categoria = categoriasInseridas.find(c => c.nome === concurso.categoria);
      return {
        ...concurso,
        categoria_id: categoria?.id
      };
    });

    const { data: concursosInseridos, error: concursosError } = await supabase
      .from('concursos')
      .insert(concursosComCategoria)
      .select();

    if (concursosError) {
      console.error('❌ Erro ao inserir concursos:', concursosError.message);
    } else {
      console.log(`✅ ${concursosInseridos.length} concursos inseridos`);
    }

    // ========================================
    // 4. Inserir Simulados de Exemplo
    // ========================================
    console.log('\n4️⃣ Inserindo simulados...');

    const simulados = [
      {
        title: 'Simulado Guarda Municipal - Português',
        description: 'Simulado completo de Português para Guarda Municipal',
        questions_count: 30,
        time_minutes: 60,
        difficulty: 'Médio',
        is_public: true,
        categoria_id: categoriasInseridas.find(c => c.slug === 'guarda-municipal')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Guarda Municipal'))?.id
      },
      {
        title: 'Simulado Polícia Civil - Direito Penal',
        description: 'Simulado de Direito Penal para Polícia Civil',
        questions_count: 25,
        time_minutes: 50,
        difficulty: 'Difícil',
        is_public: true,
        categoria_id: categoriasInseridas.find(c => c.slug === 'policia-civil')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Polícia Civil'))?.id
      },
      {
        title: 'Simulado Tribunais - Direito Constitucional',
        description: 'Simulado de Direito Constitucional para Tribunais',
        questions_count: 20,
        time_minutes: 40,
        difficulty: 'Difícil',
        is_public: true,
        categoria_id: categoriasInseridas.find(c => c.slug === 'tribunais')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Tribunal'))?.id
      }
    ];

    const { data: simuladosInseridos, error: simuladosError } = await supabase
      .from('simulados')
      .insert(simulados)
      .select();

    if (simuladosError) {
      console.error('❌ Erro ao inserir simulados:', simuladosError.message);
    } else {
      console.log(`✅ ${simuladosInseridos.length} simulados inseridos`);
    }

    // ========================================
    // 5. Inserir Flashcards de Exemplo
    // ========================================
    console.log('\n5️⃣ Inserindo flashcards...');

    const flashcards = [
      {
        front: 'O que é sujeito?',
        back: 'Termo que pratica ou recebe a ação do verbo',
        disciplina: 'Português',
        tema: 'Sintaxe',
        subtema: 'Análise Sintática',
        categoria_id: categoriasInseridas.find(c => c.slug === 'guarda-municipal')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Guarda Municipal'))?.id
      },
      {
        front: 'Qual é a pena para homicídio simples?',
        back: 'Reclusão de 6 a 20 anos',
        disciplina: 'Direito Penal',
        tema: 'Crimes contra a pessoa',
        subtema: 'Homicídio',
        categoria_id: categoriasInseridas.find(c => c.slug === 'policia-civil')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Polícia Civil'))?.id
      },
      {
        front: 'O que são direitos fundamentais?',
        back: 'Direitos básicos garantidos pela Constituição',
        disciplina: 'Direito Constitucional',
        tema: 'Direitos Fundamentais',
        subtema: 'Conceito',
        categoria_id: categoriasInseridas.find(c => c.slug === 'tribunais')?.id,
        concurso_id: concursosInseridos?.find(c => c.nome.includes('Tribunal'))?.id
      }
    ];

    const { data: flashcardsInseridos, error: flashcardsError } = await supabase
      .from('flashcards')
      .insert(flashcards)
      .select();

    if (flashcardsError) {
      console.error('❌ Erro ao inserir flashcards:', flashcardsError.message);
    } else {
      console.log(`✅ ${flashcardsInseridos.length} flashcards inseridos`);
    }

    // ========================================
    // 6. Resumo Final
    // ========================================
    console.log('\n🎉 Dados de exemplo inseridos com sucesso!');
    console.log('==========================================');
    console.log(`📊 Categorias: ${categoriasInseridas.length}`);
    console.log(`📊 Disciplinas: ${totalDisciplinas}`);
    console.log(`📊 Concursos: ${concursosInseridos?.length || 0}`);
    console.log(`📊 Simulados: ${simuladosInseridos?.length || 0}`);
    console.log(`📊 Flashcards: ${flashcardsInseridos?.length || 0}`);
    console.log('\n✅ Sistema pronto para uso!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar inserção
insertSampleData(); 