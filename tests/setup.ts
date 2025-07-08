import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Carregar variáveis de ambiente
config({ path: '.env.test' })

// Configuração do Supabase para testes
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Dados de teste
export const testData = {
  user: {
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'user'
  },
  admin: {
    email: 'admin@example.com',
    password: 'adminpassword123',
    role: 'admin'
  },
  concurso: {
    nome: 'Concurso Teste',
    descricao: 'Descrição do concurso teste',
    data_prova: '2024-12-31',
    is_active: true
  },
  apostila: {
    title: 'Apostila Teste',
    description: 'Descrição da apostila teste'
  }
}

// Tokens de autenticação para testes
export let userToken: string | null = null
export let adminToken: string | null = null

// Setup global antes de todos os testes
beforeAll(async () => {
  console.log('🚀 Iniciando setup dos testes...')
  
  try {
    // Limpar dados de teste anteriores
    await cleanupTestData()
    
    // Criar usuários de teste
    await createTestUsers()
    
    console.log('✅ Setup dos testes concluído')
  } catch (error) {
    console.error('❌ Erro no setup dos testes:', error)
    throw error
  }
})

// Cleanup global após todos os testes
afterAll(async () => {
  console.log('🧹 Limpando dados de teste...')
  
  try {
    await cleanupTestData()
    console.log('✅ Limpeza concluída')
  } catch (error) {
    console.error('❌ Erro na limpeza:', error)
  }
})

// Setup antes de cada teste
beforeEach(async () => {
  // Resetar tokens
  userToken = null
  adminToken = null
})

// Cleanup após cada teste
afterEach(async () => {
  // Limpar dados específicos do teste se necessário
})

// Funções auxiliares
async function cleanupTestData() {
  try {
    // Limpar dados de teste (manter apenas dados essenciais)
    const tables = [
      'user_apostila_progress',
      'user_simulado_progress',
      'user_flashcard_progress',
      'user_mapa_assuntos_status',
      'user_questoes_semanais_progress',
      'user_discipline_stats',
      'user_performance_cache',
      'audit_logs'
    ]
    
    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    }
  } catch (error) {
    console.warn('⚠️ Erro ao limpar dados de teste:', error)
  }
}

async function createTestUsers() {
  try {
    // Criar usuário de teste
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: testData.user.email,
      password: testData.user.password
    })
    
    if (userError) {
      console.warn('⚠️ Usuário de teste já existe ou erro:', userError.message)
    } else {
      console.log('✅ Usuário de teste criado')
    }
    
    // Criar admin de teste
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
      email: testData.admin.email,
      password: testData.admin.password
    })
    
    if (adminError) {
      console.warn('⚠️ Admin de teste já existe ou erro:', adminError.message)
    } else {
      console.log('✅ Admin de teste criado')
    }
    
    // Atualizar role do admin
    if (adminData.user) {
      await supabase.auth.updateUser({
        data: { role: 'admin' }
      })
    }
    
  } catch (error) {
    console.warn('⚠️ Erro ao criar usuários de teste:', error)
  }
}

// Função para obter token de autenticação
export async function getAuthToken(email: string, password: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ Erro ao autenticar:', error.message)
      return null
    }
    
    return data.session?.access_token || null
  } catch (error) {
    console.error('❌ Erro ao obter token:', error)
    return null
  }
}

// Função para criar dados de teste
export async function createTestConcurso() {
  try {
    const { data, error } = await supabase
      .from('concursos')
      .insert(testData.concurso)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Erro ao criar concurso de teste:', error)
    return null
  }
}

// Função para criar apostila de teste
export async function createTestApostila(concursoId: string) {
  try {
    const { data, error } = await supabase
      .from('apostilas')
      .insert({
        ...testData.apostila,
        concurso_id: concursoId
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Erro ao criar apostila de teste:', error)
    return null
  }
}

// Função para limpar dados específicos
export async function cleanupTestRecords(table: string, field: string, value: string) {
  try {
    await supabase
      .from(table)
      .delete()
      .eq(field, value)
  } catch (error) {
    console.warn(`⚠️ Erro ao limpar ${table}:`, error)
  }
} 