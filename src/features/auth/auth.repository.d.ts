import { AuthDTO } from '../../types/auth.dto.js';
export declare class AuthRepository {
    findByEmail(email: string): Promise<AuthDTO | null>;
    insert(data: AuthDTO): Promise<AuthDTO>;
    updatePassword(email: string, novaSenha: string): Promise<boolean>;
    findByToken(): Promise<AuthDTO | null>;
}
//# sourceMappingURL=auth.repository.d.ts.map