import { AuthRepository } from './auth.repository.js';
import bcrypt from 'bcryptjs';
import { Validator, LoginSchema, RegisterSchema } from '../../core/validation/index.js';
export class AuthService {
    constructor() {
        this.repository = new AuthRepository();
    }
    async login(email, senha) {
        // Valida dados de entrada
        const loginData = { email, senha };
        const validation = Validator.validate(LoginSchema, loginData);
        if (!validation.success || !validation.data) {
            throw new Error(`Dados de login inválidos: ${validation.errors?.join(', ')}`);
        }
        const user = await this.repository.findByEmail(validation.data.email);
        if (!user)
            return null;
        const senhaOk = await bcrypt.compare(validation.data.senha, user.senha);
        if (!senhaOk)
            return null;
        // Retornar DTO sem a senha real
        return { ...user, senha: '' };
    }
    async register(data) {
        // Valida dados de entrada
        const validation = Validator.validate(RegisterSchema, data);
        if (!validation.success || !validation.data) {
            throw new Error(`Dados de registro inválidos: ${validation.errors?.join(', ')}`);
        }
        return this.repository.insert(validation.data);
    }
    async forgotPassword() {
        // TODO: Implementar lógica de recuperação de senha
        return false;
    }
    async resetPassword() {
        // TODO: Implementar lógica de reset de senha
        return false;
    }
    async validateToken() {
        // TODO: Implementar lógica de validação de token
        return false;
    }
}
//# sourceMappingURL=auth.service.js.map