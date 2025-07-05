// Repository de Weak Points - refatoração SOLID
import { WeakPointDTO } from '../../types/weak-points.dto';

export class WeakPointsRepository {
  async findAll(): Promise<WeakPointDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findByUser(): Promise<WeakPointDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async insert(): Promise<WeakPointDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<WeakPointDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 