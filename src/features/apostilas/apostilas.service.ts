// Service de Apostilas - refatoração SOLID
import { ApostilaDTO } from '../../types/apostilas.dto';

export class ApostilasService {
  async getAll(): Promise<ApostilaDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<ApostilaDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<ApostilaDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<ApostilaDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 