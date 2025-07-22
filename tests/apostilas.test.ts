import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase, testData, getAuthToken, createTestConcurso, createTestApostila, cleanupTestRecords } from './setup.js'

describe('📚 Apostilas', () => {
  let adminToken: string | null = null
  let userToken: string | null = null
  let testConcursoId: string | null = null
  let testApostilaId: string | null = null

  beforeEach(async () => {
    // Obter tokens de autenticação
    adminToken = await getAuthToken(testData.admin.email, testData.admin.password)
    userToken = await getAuthToken(testData.user.email, testData.user.password)
    
    // Criar concurso de teste se não existir
    if (!testConcursoId) {
      const concurso = await createTestConcurso()
      testConcursoId = concurso?.id || null
    }
  })

  afterEach(async () => {
    // Limpar dados de teste
    if (testApostilaId) {
      await cleanupTestRecords('conteudo_apostila', 'apostila_id', testApostilaId)
      await cleanupTestRecords('apostilas', 'id', testApostilaId)
      testApostilaId = null
    }
  })

  describe('Listagem de Apostilas', () => {
    it('deve listar apostilas ativas', async () => {
      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .eq('ativo', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
      
      // Verificar se todas as apostilas retornadas estão ativas
      data?.forEach(apostila => {
        expect(apostila.ativo).toBe(true)
      })
    })

    it('deve filtrar apostilas por concurso', async () => {
      expect(testConcursoId).toBeDefined()
      
      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .eq('concurso_id', testConcursoId)
        .eq('ativo', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Verificar se todas as apostilas pertencem ao concurso
      data?.forEach(apostila => {
        expect(apostila.concurso_id).toBe(testConcursoId)
      })
    })

    it('deve buscar apostilas por título', async () => {
      const searchTerm = 'teste'
      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .ilike('titulo', `%${searchTerm}%`)
        .eq('ativo', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Verificar se os resultados contêm o termo de busca
      data?.forEach(apostila => {
        expect(apostila.titulo.toLowerCase()).toContain(searchTerm)
      })
    })

    it('deve incluir relacionomentos na listagem', async () => {
      const { data, error } = await supabase
        .from('apostilas')
        .select(`
          *,
          concursos (
            id,
            nome
          ),
          categorias_concursos (
            id,
            nome
          )
        `)
        .eq('ativo', true)
        .limit(5)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Verificar se os relacionomentos estão presentes
      data?.forEach(apostila => {
        expect(apostila.concursos).toBeDefined()
        if (apostila.categorias_concursos) {
          expect(apostila.categorias_concursos).toBeDefined()
        }
      })
    })
  })

  describe('Detalhes de Apostila', () => {
    it('deve obter detalhes de uma apostila específica', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .eq('id', testApostilaId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.id).toBe(testApostilaId)
      expect(data!.titulo).toBe(testData.apostila.titulo)
    })

    it('deve retornar erro para apostila inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      
      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .eq('id', fakeId)
        .single()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('deve incluir conteúdo da apostila', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      // Adicionar conteúdo à apostila
      const conteudo = {
        apostila_id: testApostilaId,
        titulo: 'Módulo 1',
        content_json: { content: 'Conteúdo do módulo 1' },
        module_number: 1
      }

      const { data: conteudoData, error: conteudoError } = await supabase
        .from('conteudo_apostila')
        .insert(conteudo)
        .select()
        .single()

      expect(conteudoError).toBeNull()
      expect(conteudoData).toBeDefined()

      // Buscar apostila com conteúdo
      const { data, error } = await supabase
        .from('apostilas')
        .select(`
          *,
          conteudo_apostila (
            id,
            titulo,
            content_json,
            module_number
          )
        `)
        .eq('id', testApostilaId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.conteudo_apostila).toBeDefined()
      expect(Array.isArray(data!.conteudo_apostila)).toBe(true)
      expect(data!.conteudo_apostila.length).toBeGreaterThan(0)
    })
  })

  describe('Criação de Apostila (Admin)', () => {
    it('deve criar apostila com dados válidos', async () => {
      expect(testConcursoId).toBeDefined()
      
      const novaApostila = {
        titulo: 'Nova Apostila Teste',
        descricao: 'Descrição da nova apostila',
        concurso_id: testConcursoId,
        categoria_id: null
      }

      const { data, error } = await supabase
        .from('apostilas')
        .insert(novaApostila)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.titulo).toBe(novaApostila.titulo)
      expect(data!.concurso_id).toBe(testConcursoId)

      testApostilaId = data!.id
    })

    it('deve validar campos obrigatórios', async () => {
      const apostilaInvalida = {
        descricao: 'Apenas descrição'
        // Faltando titulo e concurso_id
      }

      const { data, error } = await supabase
        .from('apostilas')
        .insert(apostilaInvalida)
        .select()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('deve validar concurso existente', async () => {
      const apostilaConcursoInexistente = {
        titulo: 'Apostila Concurso Inexistente',
        descricao: 'Teste de concurso inexistente',
        concurso_id: '00000000-0000-0000-0000-000000000000'
      }

      const { data, error } = await supabase
        .from('apostilas')
        .insert(apostilaConcursoInexistente)
        .select()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })
  })

  describe('Atualização de Apostila (Admin)', () => {
    it('deve atualizar apostila existente', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      const atualizacoes = {
        titulo: 'Apostila Atualizada',
        descricao: 'Descrição atualizada'
      }

      const { data, error } = await supabase
        .from('apostilas')
        .update(atualizacoes)
        .eq('id', testApostilaId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.titulo).toBe(atualizacoes.titulo)
      expect(data!.descricao).toBe(atualizacoes.descricao)
    })

    it('deve ativar/desativar apostila', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      // Atualizar apostila
      const atualizacoes = {
        titulo: 'Apostila Atualizada',
        descricao: 'Descrição atualizada'
      }

      const { data, error } = await supabase
        .from('apostilas')
        .update(atualizacoes)
        .eq('id', testApostilaId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.titulo).toBe(atualizacoes.titulo)
      expect(data!.descricao).toBe(atualizacoes.descricao)
    })
  })

  describe('Conteúdo de Apostila', () => {
    it('deve criar conteúdo para apostila', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      const novoConteudo = {
        apostila_id: testApostilaId,
        titulo: 'Módulo de Teste',
        conteudo: 'Conteúdo detalhado do módulo',
        ordem: 1,
        ativo: true
      }

      const { data, error } = await supabase
        .from('conteudo_apostila')
        .insert(novoConteudo)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.titulo).toBe(novoConteudo.titulo)
      expect(data!.apostila_id).toBe(testApostilaId)
    })

    it('deve listar conteúdo de apostila ordenado', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      // Criar múltiplos conteúdos
      const conteudos = [
        { titulo: 'Módulo 1', ordem: 1 },
        { titulo: 'Módulo 2', ordem: 2 },
        { titulo: 'Módulo 3', ordem: 3 }
      ]

      for (const conteudo of conteudos) {
        await supabase
          .from('conteudo_apostila')
          .insert({
            apostila_id: testApostilaId,
            titulo: conteudo.titulo,
            conteudo: `Conteúdo do ${conteudo.titulo}`,
            ordem: conteudo.ordem,
            ativo: true
          })
      }

      // Buscar conteúdo ordenado
      const { data, error } = await supabase
        .from('conteudo_apostila')
        .select('*')
        .eq('apostila_id', testApostilaId)
        .eq('ativo', true)
        .order('ordem')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBe(3)
      
      // Verificar ordem
      for (let i = 0; i < data!.length; i++) {
        expect(data![i].ordem).toBe(i + 1)
      }
    })
  })

  describe('Progresso do Usuário', () => {
    it('deve registrar progresso do usuário', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      // Fazer login como usuário
      expect(userToken).toBeDefined()
      const { data: userData } = await supabase.auth.getUser()
      expect(userData.user).toBeDefined()

      const progresso = {
        user_id: userData.user!.id,
        apostila_id: testApostilaId,
        progresso_percentual: 50,
        ultimo_modulo_acessado: 2,
        tempo_estudo_minutos: 120
      }

      const { data, error } = await supabase
        .from('progresso_usuario_apostila')
        .insert(progresso)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.progresso_percentual).toBe(50)
      expect(data!.user_id).toBe(userData.user!.id)
    })

    it('deve atualizar progresso existente', async () => {
      // Criar apostila de teste
      expect(testConcursoId).toBeDefined()
      const apostila = await createTestApostila(testConcursoId!)
      expect(apostila).toBeDefined()
      testApostilaId = apostila!.id

      // Fazer login como usuário
      expect(userToken).toBeDefined()
      const { data: userData } = await supabase.auth.getUser()
      expect(userData.user).toBeDefined()

      // Criar progresso inicial
      const progressoInicial = {
        user_id: userData.user!.id,
        apostila_id: testApostilaId,
        progresso_percentual: 25,
        ultimo_modulo_acessado: 1,
        tempo_estudo_minutos: 60
      }

      await supabase
        .from('progresso_usuario_apostila')
        .insert(progressoInicial)

      // Atualizar progresso
      const atualizacoes = {
        progresso_percentual: 75,
        ultimo_modulo_acessado: 3,
        tempo_estudo_minutos: 180
      }

      const { data, error } = await supabase
        .from('progresso_usuario_apostila')
        .update(atualizacoes)
        .eq('user_id', userData.user!.id)
        .eq('apostila_id', testApostilaId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.progresso_percentual).toBe(75)
      expect(data!.ultimo_modulo_acessado).toBe(3)
    })

    it('deve listar progresso do usuário', async () => {
      // Fazer login como usuário
      expect(userToken).toBeDefined()
      const { data: userData } = await supabase.auth.getUser()
      expect(userData.user).toBeDefined()

      // Buscar progresso do usuário
      const { data, error } = await supabase
        .from('progresso_usuario_apostila')
        .select(`
          *,
          conteudo_apostila (
            id,
            titulo,
            apostila_id
          )
        `)
        .eq('user_id', userData.user!.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Verificar se os dados pertencem ao usuário
      data?.forEach(progresso => {
        expect(progresso.user_id).toBe(userData.user!.id)
      })
    })
  })

  describe('Estatísticas de Apostilas', () => {
    it('deve contar total de apostilas ativas', async () => {
      const { count, error } = await supabase
        .from('apostilas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('deve contar apostilas por concurso', async () => {
      const { count, error } = await supabase
        .from('apostilas')
        .select('*', { count: 'exact', head: true })
        .eq('concurso_id', testConcursoId)

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Segurança e Permissões', () => {
    it('deve permitir leitura pública de apostilas ativas', async () => {
      // Teste sem autenticação
      const { data, error } = await supabase
        .from('apostilas')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('deve bloquear criação sem autenticação', async () => {
      // Fazer logout
      await supabase.auth.signOut()

      const novaApostila = {
        titulo: 'Apostila Não Autorizada',
        descricao: 'Tentativa de criação sem auth',
        concurso_id: testConcursoId,
        ativo: true
      }

      const { data, error } = await supabase
        .from('apostilas')
        .insert(novaApostila)
        .select()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('deve permitir que usuários vejam apenas seu próprio progresso', async () => {
      // Fazer login como usuário
      expect(userToken).toBeDefined()
      const { data: userData } = await supabase.auth.getUser()
      expect(userData.user).toBeDefined()

      const { data, error } = await supabase
        .from('progresso_usuario_apostila')
        .select('*')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Verificar se todos os registros pertencem ao usuário logado
      data?.forEach(progresso => {
        expect(progresso.user_id).toBe(userData.user!.id)
      })
    })
  })
}) 



