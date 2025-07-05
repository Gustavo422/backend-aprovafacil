// Service de Concursos - refatoração SOLID
import { ConcursoDTO } from '../../types/concursos.dto';

export class ConcursosService {
  async getAll(): Promise<ConcursoDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<ConcursoDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<ConcursoDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<ConcursoDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 