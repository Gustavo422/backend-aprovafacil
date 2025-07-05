// Service de User - refatoração SOLID
import { UserDTO } from '../../types/user.dto';

export class UserService {
  async getAll(): Promise<UserDTO[]> {
    // TODO: Implementar lógica de listagem
    return [];
  }

  async getById(): Promise<UserDTO | null> {
    // TODO: Implementar lógica de busca por ID
    return null;
  }

  async create(): Promise<UserDTO> {
    // TODO: Implementar lógica de criação
    throw new Error('Not implemented');
  }

  async update(): Promise<UserDTO | null> {
    // TODO: Implementar lógica de atualização
    throw new Error('Not implemented');
  }

  async delete(): Promise<boolean> {
    // TODO: Implementar lógica de remoção
    throw new Error('Not implemented');
  }
} 