// Repository de Categoria de Disciplinas - refatoração SOLID
import { CategoriaDisciplinasDTO } from '../../types/categoria-disciplinas.dto';

export class CategoriaDisciplinasRepository {
  async findAll(): Promise<CategoriaDisciplinasDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<CategoriaDisciplinasDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<CategoriaDisciplinasDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<CategoriaDisciplinasDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 