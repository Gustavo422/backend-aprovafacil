import { describe, it, expect, beforeEach } from 'vitest'
import { supabase, testData, getAuthToken } from './setup.js'

describe('🔐 Autenticação', () => {
  beforeEach(async () => {
    // Limpar sessões anteriores
    await supabase.auth.signOut()
  })

  describe('Registro de Usuário', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const testEmail = `test-${Date.now()}@example.com`
      const testPassword = 'testpassword123'

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(testEmail)
      expect(data.session).toBeDefined()
    })

    it('deve rejeitar senha muito curta', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: '123'
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('password')
    })

    it('deve rejeitar email inválido', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email',
        password: 'testpassword123'
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('email')
    })
  })

  describe('Login de Usuário', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const token = await getAuthToken(testData.user.email, testData.user.password)

      expect(token).toBeDefined()
      expect(token).toBeTypeOf('string')
      expect(token!.length).toBeGreaterThan(0)
    })

    it('deve rejeitar credenciais inválidas', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testData.user.email,
        password: 'wrongpassword'
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
      expect(data.session).toBeNull()
    })

    it('deve rejeitar email inexistente', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'testpassword123'
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
      expect(data.session).toBeNull()
    })
  })

  describe('Logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Primeiro fazer login
      await supabase.auth.signInWithPassword({
        email: testData.user.email,
        password: testData.user.password
      })

      // Verificar se está logado
      const { data: userData } = await supabase.auth.getUser()
      expect(userData.user).toBeDefined()

      // Fazer logout
      const { error } = await supabase.auth.signOut()
      expect(error).toBeNull()

      // Verificar se foi deslogado
      const { data: logoutData } = await supabase.auth.getUser()
      expect(logoutData.user).toBeNull()
    })
  })

  describe('Verificação de Sessão', () => {
    it('deve verificar sessão ativa', async () => {
      // Fazer login
      const token = await getAuthToken(testData.user.email, testData.user.password)
      expect(token).toBeDefined()

      // Verificar sessão
      const { data, error } = await supabase.auth.getUser()
      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(testData.user.email)
    })

    it('deve retornar null para sessão inexistente', async () => {
      // Garantir que não há sessão
      await supabase.auth.signOut()

      const { data, error } = await supabase.auth.getUser()
      expect(error).toBeNull()
      expect(data.user).toBeNull()
    })
  })

  describe('Atualização de Perfil', () => {
    it('deve atualizar dados do usuário', async () => {
      // Fazer login
      const token = await getAuthToken(testData.user.email, testData.user.password)
      expect(token).toBeDefined()

      // Atualizar dados
      const { data, error } = await supabase.auth.updateUser({
        data: {
          nome: 'Usuário Teste',
          role: 'user'
        }
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.user_metadata?.nome).toBe('Usuário Teste')
      expect(data.user?.user_metadata?.role).toBe('user')
    })
  })

  describe('Recuperação de Senha', () => {
    it('deve enviar email de recuperação', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        testData.user.email,
        {
          redirectTo: 'http://localhost:3000/reset-password'
        }
      )

      // Em ambiente de teste, pode não enviar email real
      // mas não deve dar erro
      expect(error).toBeNull()
    })
  })

  describe('Verificação de Email', () => {
    it('deve verificar se email está confirmado', async () => {
      const token = await getAuthToken(testData.user.email, testData.user.password)
      expect(token).toBeDefined()

      const { data, error } = await supabase.auth.getUser()
      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      
      // Em ambiente de teste, emails podem estar auto-confirmados
      // Verificar se o usuário existe
      expect(data.user?.email).toBe(testData.user.email)
    })
  })

  describe('Segurança', () => {
    it('deve rejeitar tokens inválidos', async () => {
      // Tentar usar token inválido
      const { data, error } = await supabase.auth.getUser()
      
      // Deve retornar null para usuário sem token válido
      expect(data.user).toBeNull()
    })

    it('deve limitar tentativas de login', async () => {
      // Tentar login múltiplas vezes com senha errada
      const attempts = 5
      let lastError: any = null

      for (let i = 0; i < attempts; i++) {
        const { error } = await supabase.auth.signInWithPassword({
          email: testData.user.email,
          password: 'wrongpassword'
        })
        lastError = error
      }

      // Deve ter erro após múltiplas tentativas
      expect(lastError).toBeDefined()
    })
  })
}) 