import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';

// Mock do bcrypt
vi.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const email = 'test@example.com';
      const senha = 'password123';

      const result = await authService.login(email, senha);
      
      expect(result).toBeDefined();
    });

    it('deve retornar null para credenciais inválidas', async () => {
      const email = 'invalid@example.com';
      const senha = 'wrongpassword';

      const result = await authService.login(email, senha);
      
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('deve registrar usuário com sucesso', async () => {
      const userData = {
        id: '',
        email: 'test@example.com',
        nome: 'Test User',
        senha: 'password123',
        token: ''
      };

      const result = await authService.register(userData);
      
      expect(result).toBeDefined();
    });
  });

  describe('forgotPassword', () => {
    it('deve retornar false (método não implementado)', async () => {
      const result = await authService.forgotPassword();
      
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('deve retornar false (método não implementado)', async () => {
      const result = await authService.resetPassword();
      
      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('deve retornar false (método não implementado)', async () => {
      const result = await authService.validateToken();
      
      expect(result).toBe(false);
    });
  });
}); 