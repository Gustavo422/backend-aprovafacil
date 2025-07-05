// Repository de User - refatoração SOLID
import { UserDTO } from '../../types/user.dto';

export class UserRepository {
  async findAll(): Promise<UserDTO[]> {
    // TODO: Implementar acesso ao banco
    return [];
  }

  async findById(): Promise<UserDTO | null> {
    // TODO: Implementar acesso ao banco
    return null;
  }

  async insert(): Promise<UserDTO> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async update(): Promise<UserDTO | null> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }

  async remove(): Promise<boolean> {
    // TODO: Implementar acesso ao banco
    throw new Error('Not implemented');
  }
} 