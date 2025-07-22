import { AppError } from './index.js';

/**
 * Erro de usuário não encontrado
 */
export class UsuarioNaoEncontradoError extends AppError {
  /**
   * Construtor
   * @param id ID do usuário
   */
  constructor(id: string) {
    super(`Usuário com ID ${id} não encontrado`, 404, { code: 'USER_NOT_FOUND' });
    this.name = 'UsuarioNaoEncontradoError';
  }
}

/**
 * Erro de email já existente
 */
export class EmailJaExisteError extends AppError {
  /**
   * Construtor
   * @param email Email
   */
  constructor(email: string) {
    super(`Já existe um usuário com o email ${email}`, 409, { code: 'EMAIL_ALREADY_EXISTS' });
    this.name = 'EmailJaExisteError';
  }
}