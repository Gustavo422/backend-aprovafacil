import { AuthDTO } from '../../types/auth.dto.js';
export declare class AuthService {
    private repository;
    login(email: string, senha: string): Promise<AuthDTO | null>;
    register(data: AuthDTO): Promise<AuthDTO>;
    forgotPassword(): Promise<boolean>;
    resetPassword(): Promise<boolean>;
    validateToken(): Promise<boolean>;
}
//# sourceMappingURL=auth.service.d.ts.map