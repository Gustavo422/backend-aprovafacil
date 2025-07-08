// Repository de Autenticação - refatoração SOLID
import bcrypt from 'bcryptjs';
export class AuthRepository {
    async findByEmail(email) {
        // TODO: Buscar usuário no banco de dados real
        // Exemplo mock:
        const user = mockDb.find((u) => u.email === email);
        return user || null;
    }
    async insert(data) {
        // Hash da senha antes de salvar
        const hashedPassword = await bcrypt.hash(data.senha, 10);
        const userToSave = { ...data, senha: hashedPassword };
        // TODO: Salvar userToSave no banco de dados real
        // Exemplo mock:
        mockDb.push(userToSave);
        return userToSave;
    }
    async updatePassword(email, novaSenha) {
        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(novaSenha, 10);
        // TODO: Atualizar senha no banco de dados real
        // Exemplo mock:
        const user = mockDb.find((u) => u.email === email);
        if (user) {
            user.senha = hashedPassword;
            return true;
        }
        return false;
    }
    async findByToken() {
        // TODO: Buscar usuário por token no banco de dados real
        return null;
    }
}
// Mock simples para exemplo (remover em produção)
const mockDb = [
    {
        id: '1',
        email: 'teste@exemplo.com',
        senha: '$2a$10$123456789012345678901uQw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8Qw8', // hash fake
        token: 'token123',
    },
];
//# sourceMappingURL=auth.repository.js.map