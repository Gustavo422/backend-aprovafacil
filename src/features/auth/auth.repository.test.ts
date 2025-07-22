import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepository } from './auth.repository.js';
import bcrypt from 'bcryptjs';
import { AuthDTO } from '../../types/auth.dto.js';

// Mock do bcrypt
vi.mock('bcryptjs');

describe('AuthRepository', () => {
  let authRepository: AuthRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepository = new AuthRepository();
  });

  describe('findByEmail', () => {
    it('deve encontrar usuário por email', async () => {
      const email = 'teste@exemplo.com';
      
      const result = await authRepository.findByEmail(email);
      
      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
    });

    it('deve retornar null para email inexistente', async () => {
      const email = 'inexistente@exemplo.com';
      
      const result = await authRepository.findByEmail(email);
      
      expect(result).toBeNull();
    });
  });

  describe('insert', () => {
    it('deve inserir novo usuário com senha hasheada', async () => {
      const userData = {
        id: '2',
        email: 'novo@exemplo.com',
        senha: 'password123',
        token: 'token456'
      };

      const result = await authRepository.insert(userData);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.senha).not.toBe(userData.senha); // Senha deve estar hasheada
    });
  });

  describe('updatePassword', () => {
    it('deve atualizar senha do usuário', async () => {
      const email = 'teste@exemplo.com';
      const novaSenha = 'novasenha123';
      
      const result = await authRepository.updatePassword(email, novaSenha);
      
      expect(result).toBe(true);
    });

    it('deve retornar false para usuário inexistente', async () => {
      const email = 'inexistente@exemplo.com';
      const novaSenha = 'novasenha123';
      
      const result = await authRepository.updatePassword(email, novaSenha);
      
      expect(result).toBe(false);
    });
  });

  describe('findByToken', () => {
    it('deve retornar null (método não implementado)', async () => {
      const result = await authRepository.findByToken();
      
      expect(result).toBeNull();
    });
  });

  describe('integração com mock database', () => {
    it('deve manter consistência dos dados após inserção', async () => {
      const userData: AuthDTO = {
        id: '4',
        email: 'consistencia@exemplo.com',
        senha: 'senha_consistencia',
        token: 'token_consistencia',
      };

      const hashedPassword = 'hashed_consistencia';
      (bcrypt.hash as unknown as { mockResolvedValue: (value: string) => void }).mockResolvedValue(hashedPassword);

      // Inserir usuário
      const insertedUser = await authRepository.insert(userData);
      expect(insertedUser.senha).toBe(hashedPassword);

      // Buscar usuário inserido
      const foundUser = await authRepository.findByEmail(userData.email);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    it('deve atualizar senha e manter outros dados', async () => {
      const email = 'teste@exemplo.com';
      const novaSenha = 'senha_atualizada';
      const hashedPassword = 'hashed_atualizada';
      
      (bcrypt.hash as unknown as { mockResolvedValue: (value: string) => void }).mockResolvedValue(hashedPassword);

      // Atualizar senha
      const updateResult = await authRepository.updatePassword(email, novaSenha);
      expect(updateResult).toBe(true);

      // Verificar se usuário ainda existe
      const foundUser = await authRepository.findByEmail(email);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(email);
    });
  });
}); 



