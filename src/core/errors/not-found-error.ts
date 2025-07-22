/**
 * Erro de registro não encontrado
 */
export class NotFoundError extends Error {
  /**
   * ID do registro
   */
  id?: string;
  
  /**
   * Entidade
   */
  entity?: string;
  
  /**
   * Construtor
   * @param message Mensagem de erro
   * @param options Opções do erro
   */
  constructor(message: string, options?: { id?: string; entity?: string }) {
    super(message);
    this.name = 'NotFoundError';
    this.id = options?.id;
    this.entity = options?.entity;
  }
}