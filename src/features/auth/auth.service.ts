// Service de Autenticação - refatoração SOLID
import { AuthDTO } from '../../types/auth.dto';
import { AuthRepository } from './auth.repository';
import bcrypt from 'bcryptjs';
import { Validator, LoginSchema, RegisterSchema } from '../../core/validation';

export class AuthService {
  private repository = new AuthRepository();

  async login(email: string, senha: string): Promise<AuthDTO | null> {
    // Valida dados de entrada
    const loginData = { email, senha };
    const validation = Validator.validate(LoginSchema, loginData);
    
    if (!validation.success || !validation.data) {
      throw new Error(`Dados de login inválidos: ${validation.errors?.join(', ')}`);
    }

    const user = await this.repository.findByEmail(validation.data.email);
    if (!user) return null;
    
    const senhaOk = await bcrypt.compare(validation.data.senha, user.senha);
    if (!senhaOk) return null;
    
    // Retornar DTO sem a senha real
    return { ...user, senha: '' };
  }

  async register(data: AuthDTO): Promise<AuthDTO> {
    // Valida dados de entrada
    const validation = Validator.validate(RegisterSchema, data);
    
    if (!validation.success || !validation.data) {
      throw new Error(`Dados de registro inválidos: ${validation.errors?.join(', ')}`);
    }

    return this.repository.insert(validation.data as unknown as AuthDTO);
  }

  async forgotPassword(): Promise<boolean> {
    // TODO: Implementar lógica de recuperação de senha
    return false;
  }

  async resetPassword(): Promise<boolean> {
    // TODO: Implementar lógica de reset de senha
    return false;
  }

  async validateToken(): Promise<boolean> {
    // TODO: Implementar lógica de validação de token
    return false;
  }
} 