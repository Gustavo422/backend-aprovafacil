// Service de Categoria de Disciplinas - refatoração SOLID
import { CategoriaDisciplinasDTO } from '../../types/categoria-disciplinas.dto';

export class CategoriaDisciplinasService {
  async getAll(): Promise<CategoriaDisciplinasDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<CategoriaDisciplinasDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<CategoriaDisciplinasDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<CategoriaDisciplinasDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 