// Repository de Apostilas - refatoração SOLID
import { ApostilaDTO } from '../../types/apostilas.dto';

export class ApostilasRepository {
  async findAll(): Promise<ApostilaDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<ApostilaDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<ApostilaDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<ApostilaDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 