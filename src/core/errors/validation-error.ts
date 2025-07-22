/**
 * Erro de validação
 */
export class ValidationError extends Error {
  /**
   * Erros de validação
   */
  errors?: string[];
  
  /**
   * Campo com erro
   */
  field?: string;
  
  /**
   * Construtor
   * @param message Mensagem de erro
   * @param options Opções do erro
   */
  constructor(message: string, options?: { errors?: string[]; field?: string }) {
    super(message);
    this.name = 'ValidationError';
    this.errors = options?.errors;
    this.field = options?.field;
  }
}