// Service de Concurso Categorias - refatoração SOLID
import { ConcursoCategoriaDTO } from '../../types/concurso-categorias.dto';

export class ConcursoCategoriasService {
  async getAll(): Promise<ConcursoCategoriaDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<ConcursoCategoriaDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<ConcursoCategoriaDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<ConcursoCategoriaDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 