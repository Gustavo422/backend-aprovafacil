// Erro base para aplicação
export class AppError extends Error {
  /**
   * Código HTTP
   */
  statusCode: number;
  
  /**
   * Código de erro
   */
  code?: string;
  
  /**
   * Detalhes do erro
   */
  details?: unknown;
  
  /**
   * Construtor
   * @param message Mensagem de erro
   * @param statusCode Código HTTP
   * @param options Opções do erro
   */
  constructor(message: string, statusCode: number = 500, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export { DatabaseError } from './database-error.js';
export { NotFoundError } from './not-found-error.js';
export { ValidationError } from './validation-error.js';

// Removidas as reexportações de usuario-errors.ts para evitar ciclo de importação