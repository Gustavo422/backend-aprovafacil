import type { IAuthService } from '../core/interfaces/index.js';
import type { Usuario, ApiResponse } from '../shared/types/index.js';
import type { EnhancedAuthService } from './enhanced-auth.service.js';

/**
 * Adapter para tornar EnhancedAuthService compatível com IAuthService
 */
export class AuthServiceAdapter implements IAuthService {
  private readonly enhancedAuthService: EnhancedAuthService;

  constructor(enhancedAuthService: EnhancedAuthService) {
    this.enhancedAuthService = enhancedAuthService;
  }

  async login(email: string, senha: string): Promise<ApiResponse<{ usuario: Usuario; token: string }>> {
    try {
      const result = await this.enhancedAuthService.login({
        email,
        password: senha,
        ipAddress: 'unknown',
        userAgent: 'adapter-mode',
      });

      if (result.success && result.user && result.accessToken) {
        return {
          success: true,
          data: {
            usuario: result.user as unknown as Usuario,
            token: result.accessToken,
          },
          message: 'Login realizado com sucesso',
        };
      } 
        return {
          success: false,
          error: result.error ?? 'Erro no login',
          message: result.error ?? 'Falha na autenticação',
        };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno';
      return {
        success: false,
        error: errorMessage,
        message: 'Erro interno do servidor',
      };
    }
  }

  async validarToken(token: string): Promise<Usuario | null> {
    return await this.enhancedAuthService.validarToken(token) as unknown as Usuario | null;
  }

  async criarHash(senha: string): Promise<string> {
    return await this.enhancedAuthService.criarHash(senha);
  }

  async verificarSenha(senha: string, hash: string): Promise<boolean> {
    return await this.enhancedAuthService.verificarSenha(senha, hash);
  }

  async gerarToken(usuario: Usuario): Promise<string> {
    return this.enhancedAuthService.gerarToken(usuario as unknown as Record<string, unknown>);
  }
}