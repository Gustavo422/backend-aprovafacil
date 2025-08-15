import type { SupabaseClient } from '@supabase/supabase-js';
import { getEnhancedLogger, type EnhancedLogger } from '../lib/logging/enhanced-logging-service.js';
import { LoginSecurityService } from '../security/login-security.service.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
  deviceName?: string;
  ipAddress: string;
  userAgent?: string;
}

interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
  expiresIn?: number;
  error?: string;
  errorCode?: string;
  requiresPasswordChange?: boolean;
  securityWarning?: string;
}

interface UserSession {
  id: string;
  usuarioId: string;
  tokenHash: string;
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  active: boolean;
}

interface Usuario {
  id: string;
  email: string;
  senha_hash: string;
  ativo: boolean;
  primeiro_login?: boolean;
  role?: string;
  nome?: string;
  is_admin?: boolean;
}

export class EnhancedAuthService {
  private readonly supabase: SupabaseClient;
  private readonly logger: EnhancedLogger;
  private readonly securityService: LoginSecurityService;
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;

  constructor(
    supabaseClient: SupabaseClient,
    options: {
      jwtSecret: string;
      accessTokenExpiry?: number; // em segundos
      refreshTokenExpiry?: number; // em segundos
    },
  ) {
    this.supabase = supabaseClient;
    this.logger = getEnhancedLogger('enhanced-auth');
    this.securityService = new LoginSecurityService(supabaseClient);
    
    this.jwtSecret = options.jwtSecret;
    // Configurar para valores seguros por padrão
    this.accessTokenExpiry = options.accessTokenExpiry ?? 900; // 15 minutos por padrão
    this.refreshTokenExpiry = options.refreshTokenExpiry ?? 604800; // 7 dias por padrão
  }

  /**
   * Login avançado com todas as funcionalidades de segurança
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const startTime = performance.now();
    const operationId = `login-${Date.now()}`;
    
    try {
      this.logger.info('Tentativa de login iniciada', {
        operationId,
        email: this.sanitizeEmail(credentials.email),
        ipAddress: credentials.ipAddress,
        deviceName: credentials.deviceName,
      });

      // 1. Validação básica
      const validationError = this.validateLoginCredentials(credentials);
      if (validationError) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          validationError,
          credentials.userAgent,
          credentials.deviceFingerprint,
        );
        return { success: false, error: validationError, errorCode: 'VALIDATION_ERROR' };
      }

      // 2. Verificação de segurança
      const securityCheck = await this.securityService.checkLoginSecurity(
        credentials.email,
        credentials.ipAddress,
        credentials.userAgent,
      );

      if (!securityCheck.allowed) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          securityCheck.reason,
          credentials.userAgent,
          credentials.deviceFingerprint,
        );

        return {
          success: false,
          error: securityCheck.reason ?? 'Acesso bloqueado por segurança',
          errorCode: 'SECURITY_BLOCK',
        };
      }

      // 3. Buscar usuário
      const { data: user, error: userError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('email', credentials.email)
        .single();

      if (userError || !user) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          'Usuário não encontrado',
          credentials.userAgent,
          credentials.deviceFingerprint,
        );

        return {
          success: false,
          error: 'Email ou senha incorretos',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      const usuario = user as Usuario;

      // 4. Verificar se usuário está ativo
      if (!usuario.ativo) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          'Conta desativada',
          credentials.userAgent,
          credentials.deviceFingerprint,
        );

        return {
          success: false,
          error: 'Conta desativada. Entre em contato com o suporte',
          errorCode: 'ACCOUNT_DISABLED',
        };
      }

      // 5. Verificar senha
      const passwordValid = await bcrypt.compare(credentials.password, usuario.senha_hash);
      if (!passwordValid) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          'Senha incorreta',
          credentials.userAgent,
          credentials.deviceFingerprint,
        );

        return {
          success: false,
          error: 'Email ou senha incorretos',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // 6. Gerar tokens
      const accessToken = this.generateAccessToken(usuario);
      const refreshToken = await this.generateRefreshToken(
        usuario.id,
        credentials.deviceFingerprint,
        credentials.deviceName,
        credentials.ipAddress,
        credentials.userAgent,
        credentials.rememberMe,
      );

      // 7. Criar sessão
      await this.createUserSession(
        usuario.id,
        accessToken,
        {
          deviceFingerprint: credentials.deviceFingerprint,
          deviceName: credentials.deviceName,
          platform: this.extractPlatform(credentials.userAgent),
        },
        credentials.ipAddress,
        credentials.userAgent,
      );

      // 8. Atualizar último login
      await this.supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', usuario.id);

      // 9. Registrar login bem-sucedido
      await this.securityService.recordLoginAttempt(
        credentials.email,
        credentials.ipAddress,
        true,
        undefined,
        credentials.userAgent,
        credentials.deviceFingerprint,
      );

      // 10. Log de auditoria
      await this.logAuditEvent(
        usuario.id,
        'LOGIN',
        'auth',
        usuario.id,
        { ipAddress: credentials.ipAddress, deviceName: credentials.deviceName },
        credentials.ipAddress,
        credentials.userAgent,
      );

      const executionTime = performance.now() - startTime;
      this.logger.info('Login realizado com sucesso', {
        operationId,
        usuarioId: usuario.id,
        executionTimeMs: executionTime.toFixed(2),
        securityRisk: securityCheck.riskLevel,
      });

      // Remover dados sensíveis
      const userWithoutPassword = { ...usuario };

      let securityWarning: string | undefined;
      if (securityCheck.riskLevel === 'high') {
        securityWarning = 'Login detectado de localização incomum. Verifique sua segurança.';
      }

      return {
        success: true,
        accessToken,
        refreshToken,
        user: userWithoutPassword,
        expiresIn: this.accessTokenExpiry,
        requiresPasswordChange: usuario.primeiro_login,
        securityWarning,
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      this.logger.error('Erro durante login', {
        operationId,
        error: errorMessage,
        executionTimeMs: executionTime.toFixed(2),
      });

      return {
        success: false,
        error: 'Erro interno do servidor',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Refresh de token
   */
  async refreshToken(refreshTokenValue: string, ipAddress: string, _userAgent?: string): Promise<AuthResult> {
    try {
      const tokenHash = this.hashToken(refreshTokenValue);

      // Buscar refresh token
      const { data: refreshTokenData, error } = await this.supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !refreshTokenData) {
        return {
          success: false,
          error: 'Token de refresh inválido ou expirado',
          errorCode: 'INVALID_REFRESH_TOKEN',
        };
      }

      // Verificar se o usuário ainda existe e está ativo
      const { data: user, error: userError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', refreshTokenData.usuario_id)
        .single();

      if (userError || !user?.ativo) {
        return {
          success: false,
          error: 'Usuário não encontrado ou inativo',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      const usuario = user as Usuario;

      // Gerar novos tokens
      const accessToken = this.generateAccessToken(usuario);
      const refreshToken = await this.generateRefreshToken(
        usuario.id,
        refreshTokenData.device_fingerprint,
        refreshTokenData.device_name,
        ipAddress,
        _userAgent,
        refreshTokenData.remember_me,
      );

      // Atualizar refresh token
      await this.supabase
        .from('refresh_tokens')
        .update({ 
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'refreshed'
        })
        .eq('id', refreshTokenData.id);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: usuario as unknown as Record<string, unknown>,
        expiresIn: this.accessTokenExpiry,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      this.logger.error('Erro durante refresh de token', { error: errorMessage });

      return {
        success: false,
        error: 'Erro interno do servidor',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Logout de uma sessão específica
   */
  async logout(token: string, usuarioId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenHash = this.hashToken(token);

      // Revogar refresh token
      await this.supabase
        .from('refresh_tokens')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'User logout',
        })
        .eq('usuario_id', usuarioId);

      // Desativar sessão
      await this.supabase
        .from('sessoes_usuario')
        .update({ ativo: false })
        .eq('usuario_id', usuarioId)
        .eq('token_hash', tokenHash);

      // Log de auditoria
      await this.logAuditEvent(usuarioId, 'LOGOUT', 'auth', usuarioId);

      this.logger.info('Logout realizado', { usuarioId });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno';
      this.logger.error('Erro no logout', { error: errorMessage, usuarioId });
      return { success: false, error: 'Erro interno' };
    }
  }

  /**
   * Logout de todas as sessões do usuário
   */
  async logoutAllSessions(usuarioId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Revogar todos os refresh tokens
      await this.supabase
        .from('refresh_tokens')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'Logout all sessions',
        })
        .eq('usuario_id', usuarioId);

      // Desativar todas as sessões
      await this.supabase
        .from('sessoes_usuario')
        .update({ ativo: false })
        .eq('usuario_id', usuarioId);

      // Log de auditoria
      await this.logAuditEvent(usuarioId, 'LOGOUT_ALL', 'auth', usuarioId);

      this.logger.info('Logout de todas as sessões', { usuarioId });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno';
      this.logger.error('Erro no logout geral', { error: errorMessage, usuarioId });
      return { success: false, error: 'Erro interno' };
    }
  }

  /**
   * Validar token de acesso
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; user?: { id: string; email: string; role: string; nome?: string; ativo?: boolean; primeiro_login?: boolean; is_admin?: boolean; }; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { usuarioId: string };
      
      // Buscar usuário
      const { data: user, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', decoded.usuarioId)
        .single();

      if (error || !user?.ativo) {
        return { valid: false, error: 'Usuário não encontrado ou inativo' };
      }

      const usuario = user as Usuario;

      const userWithoutPassword = {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role ?? 'user',
        nome: usuario.nome,
        ativo: usuario.ativo,
        primeiro_login: usuario.primeiro_login,
        is_admin: usuario.is_admin,
      };

      return { valid: true, user: userWithoutPassword };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token inválido';
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Obter sessões ativas do usuário
   */
  async getUserSessions(usuarioId: string): Promise<UserSession[]> {
    const { data, error } = await this.supabase
      .from('sessoes_usuario') // Tabela correta
      .select('*')
      .eq('usuario_id', usuarioId) // Coluna correta
      .eq('ativo', true)
      .gt('expira_em', new Date().toISOString())
      .order('ultimo_acesso', { ascending: false });

    if (error) {
      this.logger.error('Erro ao buscar sessões', { error: error.message, usuarioId });
      return [];
    }

    return (data as UserSession[]) ?? [];
  }

  /**
   * Revogar sessão específica
   */
  async revokeSession(usuarioId: string, sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.supabase
        .from('sessoes_usuario')
        .update({ ativo: false })
        .eq('id', sessionId)
        .eq('usuario_id', usuarioId);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao revogar sessão', { error: errorMessage });
      return { success: false };
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  private validateLoginCredentials(credentials: LoginCredentials): string | null {
    if (!credentials.email || !credentials.password) {
      return 'Email e senha são obrigatórios';
    }

    if (!this.isValidEmail(credentials.email)) {
      return 'Email inválido';
    }

    if (credentials.password.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }

    return null;
  }

  private generateAccessToken(user: Usuario): string {
    const payload = {
      usuarioId: user.id, // CORRIGIDO
      email: user.email,
      role: user.role ?? 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiry,
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  private async generateRefreshToken(
    usuarioId: string,
    deviceFingerprint?: string,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe?: boolean,
  ): Promise<string> {
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(tokenValue);
    
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setTime(expiresAt.getTime() + (this.refreshTokenExpiry * 1000));
    } else {
      expiresAt.setTime(expiresAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 dias
    }

    await this.supabase
      .from('refresh_tokens')
      .insert({
        usuario_id: usuarioId, // CORRIGIDO
        token_hash: tokenHash,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
      });

    return tokenValue;
  }

  private async createUserSession(
    usuarioId: string,
    accessToken: string,
    deviceInfo: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(accessToken);
    const expiresAt = new Date(Date.now() + (this.accessTokenExpiry * 1000));

    await this.supabase
      .from('sessoes_usuario') // Tabela correta
      .insert({
        usuario_id: usuarioId, // Coluna correta
        token_hash: tokenHash,
        dispositivo: deviceInfo, // 'device_info' -> 'dispositivo'
        ip_address: ipAddress,
        user_agent: userAgent,
        expira_em: expiresAt.toISOString(), // 'expires_at' -> 'expira_em'
      });
  }

  private async updateSessionActivity(usuarioId: string, ipAddress?: string): Promise<void> {
    await this.supabase
      .from('sessoes_usuario') // Tabela correta
      .update({
        ultimo_acesso: new Date().toISOString(), // 'last_activity' -> 'ultimo_acesso'
        ip_address: ipAddress,
      })
      .eq('usuario_id', usuarioId) // Coluna correta
      .eq('ativo', true);
  }

  private async logAuditEvent(
    usuarioId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          usuario_id: usuarioId,
          action,
          resource,
          resource_id: resourceId,
          details,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao registrar log de auditoria', { error: errorMessage });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${(local ?? '').substring(0, 2)}***@${domain}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private extractPlatform(_userAgent?: string): string {
    if (!_userAgent) return 'unknown';
    
    if (_userAgent.includes('Windows')) return 'Windows';
    if (_userAgent.includes('Mac')) return 'macOS';
    if (_userAgent.includes('Linux')) return 'Linux';
    if (_userAgent.includes('Android')) return 'Android';
    if (_userAgent.includes('iPhone') || _userAgent.includes('iPad')) return 'iOS';
    
    return 'unknown';
  }

  // ========== COMPATIBILITY METHODS ==========
  // Métodos para compatibilidade com IAuthService

  /**
   * Criar hash de senha (compatibilidade)
   */
  async criarHash(senha: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(senha, saltRounds);
  }

  /**
   * Verificar senha (compatibilidade)
   */
  async verificarSenha(senha: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(senha, hash);
  }

  /**
   * Gerar token (compatibilidade)
   */
  gerarToken(usuario: Record<string, unknown>): string {
    return this.generateAccessToken(usuario as unknown as Usuario);
  }

  /**
   * Validar token (compatibilidade)
   */
  async validarToken(token: string): Promise<Record<string, unknown> | null> {
    const validation = await this.validateAccessToken(token);
    return validation.valid && validation.user ? validation.user : null;
  }

  /**
   * Login simples (compatibilidade com interface antiga)
   */
  async loginSimple(email: string, senha: string): Promise<AuthResult> {
    const result = await this.login({
      email,
      password: senha,
      ipAddress: 'unknown',
      userAgent: 'compatibility-mode',
    });

    if (result.success) {
      return {
        success: true,
        user: result.user,
        accessToken: result.accessToken,
      };
    } 
      return {
        success: false,
        error: result.error,
      };
    
  }
} 