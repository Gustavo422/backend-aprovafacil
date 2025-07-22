/**
 * Erro de banco de dados
 */
export class DatabaseError extends Error {
  /**
   * Código do erro
   */
  code?: string;
  
  /**
   * Detalhes do erro
   */
  details?: unknown;
  
  /**
   * Causa do erro
   */
  cause?: unknown;
  
  /**
   * Construtor
   * @param message Mensagem de erro
   * @param options Opções do erro
   */
  constructor(message: string, options?: { code?: string; details?: unknown; cause?: unknown }) {
    super(message);
    this.name = 'DatabaseError';
    this.code = options?.code;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}