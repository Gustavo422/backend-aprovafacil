import { createClient } from '@supabase/supabase-js';
import { EnhancedLogger, getEnhancedLogger } from '../lib/logging/enhanced-logging-service.js';
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
  userId: string;
  tokenHash: string;
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  active: boolean;
}

export class EnhancedAuthService {
  private supabase: ReturnType<typeof createClient>;
  private logger: EnhancedLogger;
  private securityService: LoginSecurityService;
  private jwtSecret: string;
  private accessTokenExpiry: number;
  private refreshTokenExpiry: number;

  constructor(
    supabaseClient: ReturnType<typeof createClient>,
    options: {
      jwtSecret: string;
      accessTokenExpiry?: number; // em segundos
      refreshTokenExpiry?: number; // em segundos
    }
  ) {
    this.supabase = supabaseClient;
    this.logger = getEnhancedLogger('enhanced-auth');
    this.securityService = new LoginSecurityService(supabaseClient);
    
    this.jwtSecret = options.jwtSecret;
    this.accessTokenExpiry = options.accessTokenExpiry || 3600; // 1 hora
    this.refreshTokenExpiry = options.refreshTokenExpiry || 2592000; // 30 dias
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
        deviceName: credentials.deviceName
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
          credentials.deviceFingerprint
        );
        return { success: false, error: validationError, errorCode: 'VALIDATION_ERROR' };
      }

      // 2. Verificação de segurança
      const securityCheck = await this.securityService.checkLoginSecurity(
        credentials.email,
        credentials.ipAddress,
        credentials.userAgent
      );

      if (!securityCheck.allowed) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          securityCheck.reason,
          credentials.userAgent,
          credentials.deviceFingerprint
        );

        return {
          success: false,
          error: securityCheck.reason || 'Acesso bloqueado por segurança',
          errorCode: 'SECURITY_BLOCK'
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
          credentials.deviceFingerprint
        );

        return {
          success: false,
          error: 'Email ou senha incorretos',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // 4. Verificar se usuário está ativo
      if (!user.ativo) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          'Conta desativada',
          credentials.userAgent,
          credentials.deviceFingerprint
        );

        return {
          success: false,
          error: 'Conta desativada. Entre em contato com o suporte',
          errorCode: 'ACCOUNT_DISABLED'
        };
      }

      // 5. Verificar senha
      const passwordValid = await bcrypt.compare(credentials.password, user.senha_hash);
      if (!passwordValid) {
        await this.securityService.recordLoginAttempt(
          credentials.email,
          credentials.ipAddress,
          false,
          'Senha incorreta',
          credentials.userAgent,
          credentials.deviceFingerprint
        );

        return {
          success: false,
          error: 'Email ou senha incorretos',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // 6. Gerar tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(
        user.id,
        credentials.deviceFingerprint,
        credentials.deviceName,
        credentials.ipAddress,
        credentials.userAgent,
        credentials.rememberMe
      );

      // 7. Criar sessão
      await this.createUserSession(
        user.id,
        accessToken,
        {
          deviceFingerprint: credentials.deviceFingerprint,
          deviceName: credentials.deviceName,
          platform: this.extractPlatform(credentials.userAgent)
        },
        credentials.ipAddress,
        credentials.userAgent
      );

      // 8. Atualizar último login
      await this.supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', user.id);

      // 9. Registrar login bem-sucedido
      await this.securityService.recordLoginAttempt(
        credentials.email,
        credentials.ipAddress,
        true,
        undefined,
        credentials.userAgent,
        credentials.deviceFingerprint
      );

      // 10. Log de auditoria
      await this.logAuditEvent(
        user.id,
        'LOGIN',
        'auth',
        user.id,
        { ipAddress: credentials.ipAddress, deviceName: credentials.deviceName },
        credentials.ipAddress,
        credentials.userAgent
      );

      const executionTime = performance.now() - startTime;
      this.logger.info('Login realizado com sucesso', {
        operationId,
        userId: user.id,
        executionTimeMs: executionTime.toFixed(2),
        securityRisk: securityCheck.riskLevel
      });

      // Remover dados sensíveis
      const userWithoutPassword = { ...user };

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
        requiresPasswordChange: user.primeiro_login,
        securityWarning
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.logger.error('Erro durante login', {
        operationId,
        error: error.message,
        executionTimeMs: executionTime.toFixed(2)
      });

      return {
        success: false,
        error: 'Erro interno do servidor',
        errorCode: 'INTERNAL_ERROR'
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
          errorCode: 'INVALID_REFRESH_TOKEN'
        };
      }

      // Buscar usuário
      const { data: user, error: userError } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', refreshTokenData.user_id)
        .single();

      if (userError || !user || !user.ativo) {
        return {
          success: false,
          error: 'Usuário não encontrado ou inativo',
          errorCode: 'USER_NOT_FOUND'
        };
      }

      // Gerar novo access token
      const newAccessToken = this.generateAccessToken(user);

      // Atualizar último uso do refresh token
      await this.supabase
        .from('refresh_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', refreshTokenData.id);

      // Atualizar sessão
      await this.updateSessionActivity(user.id, ipAddress);

      this.logger.info('Token refreshed com sucesso', { userId: user.id });

      const userWithoutPassword = { ...user };

      return {
        success: true,
        accessToken: newAccessToken,
        user: userWithoutPassword,
        expiresIn: this.accessTokenExpiry
      };

    } catch (error) {
      this.logger.error('Erro no refresh de token', { error: error.message });
      return {
        success: false,
        error: 'Erro interno do servidor',
        errorCode: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Logout de uma sessão específica
   */
  async logout(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenHash = this.hashToken(token);

      // Revogar refresh token
      await this.supabase
        .from('refresh_tokens')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'User logout'
        })
        .eq('user_id', userId);

      // Desativar sessão
      await this.supabase
        .from('user_sessions')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('token_hash', tokenHash);

      // Log de auditoria
      await this.logAuditEvent(userId, 'LOGOUT', 'auth', userId);

      this.logger.info('Logout realizado', { userId });

      return { success: true };

    } catch (error) {
      this.logger.error('Erro no logout', { error: error.message, userId });
      return { success: false, error: 'Erro interno' };
    }
  }

  /**
   * Logout de todas as sessões do usuário
   */
  async logoutAllSessions(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Revogar todos os refresh tokens
      await this.supabase
        .from('refresh_tokens')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: 'Logout all sessions'
        })
        .eq('user_id', userId);

      // Desativar todas as sessões
      await this.supabase
        .from('user_sessions')
        .update({ active: false })
        .eq('user_id', userId);

      // Log de auditoria
      await this.logAuditEvent(userId, 'LOGOUT_ALL', 'auth', userId);

      this.logger.info('Logout de todas as sessões', { userId });

      return { success: true };

    } catch (error) {
      this.logger.error('Erro no logout geral', { error: error.message, userId });
      return { success: false, error: 'Erro interno' };
    }
  }

  /**
   * Validar token de acesso
   */
  async validateAccessToken(token: string): Promise<{ valid: boolean; user?: { id: string; email: string; role: string; nome?: string; ativo?: boolean; primeiro_login?: boolean; is_admin?: boolean; }; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      
      // Buscar usuário
      const { data: user, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user || !user.ativo) {
        return { valid: false, error: 'Usuário não encontrado ou inativo' };
      }

      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        role: user.role,
        nome: user.nome,
        ativo: user.ativo,
        primeiro_login: user.primeiro_login,
        is_admin: user.is_admin
      };

      return { valid: true, user: userWithoutPassword };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expirado' };
      }
      return { valid: false, error: 'Token inválido' };
    }
  }

  /**
   * Obter sessões ativas do usuário
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const { data, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false });

    if (error) {
      this.logger.error('Erro ao buscar sessões', { error: error.message, userId });
      return [];
    }

    return data || [];
  }

  /**
   * Revogar sessão específica
   */
  async revokeSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.supabase
        .from('user_sessions')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('id', sessionId);

      await this.logAuditEvent(userId, 'REVOKE_SESSION', 'session', sessionId);

      return { success: true };
    } catch (error) {
      this.logger.error('Erro ao revogar sessão', { error: error.message });
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

  private generateAccessToken(user: Record<string, unknown>): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiry
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  private async generateRefreshToken(
    userId: string,
    deviceFingerprint?: string,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe?: boolean
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
        user_id: userId,
        token_hash: tokenHash,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString()
      });

    return tokenValue;
  }

  private async createUserSession(
    userId: string,
    accessToken: string,
    deviceInfo: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(accessToken);
    const expiresAt = new Date(Date.now() + (this.accessTokenExpiry * 1000));

    await this.supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        device_info: deviceInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString()
      });
  }

  private async updateSessionActivity(userId: string, ipAddress?: string): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
        ip_address: ipAddress
      })
      .eq('user_id', userId)
      .eq('active', true);
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          resource,
          resource_id: resourceId,
          details,
          ip_address: ipAddress,
          user_agent: userAgent
        });
    } catch (error) {
      this.logger.error('Erro ao registrar log de auditoria', { error: error.message });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
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
  async gerarToken(usuario: Record<string, unknown>): Promise<string> {
    return this.generateAccessToken(usuario);
  }

  /**
   * Validar token (compatibilidade)
   */
  async validarToken(token: string): Promise<Record<string, unknown> | null> {
    const validation = await this.validateAccessToken(token);
    return validation.valid ? validation.user : null;
  }

  /**
   * Login simples (compatibilidade com interface antiga)
   */
  async loginSimple(email: string, senha: string): Promise<AuthResult> {
    const result = await this.login({
      email,
      password: senha,
      ipAddress: 'unknown',
      userAgent: 'compatibility-mode'
    });

    if (result.success) {
      return {
        success: true,
        user: result.user,
        accessToken: result.accessToken
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  }
} 