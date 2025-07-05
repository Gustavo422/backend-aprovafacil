// Repository de Concurso Categorias - refatoração SOLID
import { ConcursoCategoriaDTO } from '../../types/concurso-categorias.dto';

export class ConcursoCategoriasRepository {
  async findAll(): Promise<ConcursoCategoriaDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<ConcursoCategoriaDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<ConcursoCategoriaDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<ConcursoCategoriaDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 