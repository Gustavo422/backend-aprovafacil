// Repository de Concursos - refatoração SOLID
import { ConcursoDTO } from '../../types/concursos.dto';

export class ConcursosRepository {
  async findAll(): Promise<ConcursoDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<ConcursoDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<ConcursoDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<ConcursoDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 