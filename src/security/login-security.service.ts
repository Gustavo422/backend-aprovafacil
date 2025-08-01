import { SupabaseClient } from '@supabase/supabase-js';
import { EnhancedLogger, getEnhancedLogger } from '../lib/logging/enhanced-logging-service.js';

interface LoginAttempt {
  id?: string;
  ip_address: string;
  email: string;
  user_agent?: string;
  success: boolean;
  failure_reason?: string;
  device_fingerprint?: string;
  location?: string;
  attempted_at: Date;
  blocked_until?: Date;
}

interface SecurityConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  maxAttemptsPerHour: number;
  maxAttemptsPerDay: number;
  suspiciousActivityThreshold: number;
  whitelistedIPs: string[];
}

interface SecurityCheck {
  allowed: boolean;
  reason?: string;
  remainingAttempts?: number;
  blockedUntil?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class LoginSecurityService {
  private supabase: SupabaseClient;
  private logger: EnhancedLogger;
  private config: SecurityConfig;

  constructor(
    supabaseClient: SupabaseClient,
    config: Partial<SecurityConfig> = {},
  ) {
    this.supabase = supabaseClient;
    this.logger = getEnhancedLogger('login-security');
    
    this.config = {
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      maxAttemptsPerHour: 10,
      maxAttemptsPerDay: 50,
      suspiciousActivityThreshold: 3,
      whitelistedIPs: ['127.0.0.1', '::1'],
      ...config,
    };
  }

  /**
   * Verificar se um login é permitido baseado em regras de segurança
   */
  async checkLoginSecurity(
    email: string,
    ipAddress: string,
    _userAgent?: string,
  ): Promise<SecurityCheck> {
    try {
      // Verificar IP na whitelist
      if (this.config.whitelistedIPs.includes(ipAddress)) {
        return {
          allowed: true,
          riskLevel: 'low',
        };
      }

      // Verificar bloqueios ativos
      const ipBlock = await this.checkIPBlock(ipAddress);
      if (ipBlock.blocked) {
        this.logger.warn('Tentativa de login de IP bloqueado', {
          email, ipAddress, blockedUntil: ipBlock.blockedUntil,
        });
        
        return {
          allowed: false,
          reason: 'IP temporariamente bloqueado',
          blockedUntil: ipBlock.blockedUntil,
          riskLevel: 'critical',
        };
      }

      const emailBlock = await this.checkEmailBlock(email);
      if (emailBlock.blocked) {
        this.logger.warn('Tentativa de login de email bloqueado', {
          email, ipAddress, blockedUntil: emailBlock.blockedUntil,
        });
        
        return {
          allowed: false,
          reason: 'Muitas tentativas falharam. Tente novamente mais tarde',
          blockedUntil: emailBlock.blockedUntil,
          riskLevel: 'high',
        };
      }

      // Verificar rate limiting
      const rateLimitCheck = await this.checkRateLimit(email, ipAddress);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // Verificar atividade suspeita
      const suspiciousCheck = await this.checkSuspiciousActivity(email, ipAddress);
      
      return {
        allowed: true,
        riskLevel: suspiciousCheck.riskLevel,
        remainingAttempts: this.config.maxFailedAttempts - rateLimitCheck.recentFailures,
      };

    } catch (error) {
      this.logger.error('Erro na verificação de segurança', { error: error.message, email, ipAddress });
      
      // Em caso de erro, ser conservador e bloquear
      return {
        allowed: false,
        reason: 'Erro interno de segurança',
        riskLevel: 'critical',
      };
    }
  }

  /**
   * Registrar tentativa de login
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    failureReason?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<void> {
    try {
      const attempt: LoginAttempt = {
        ip_address: ipAddress,
        email,
        user_agent: userAgent,
        success,
        failure_reason: failureReason,
        device_fingerprint: deviceFingerprint,
        attempted_at: new Date(),
      };

      // Salvar no banco
      const { error } = await this.supabase
        .from('login_attempts')
        .insert(attempt);

      if (error) {
        this.logger.error('Erro ao salvar tentativa de login', { error: error.message, attempt });
      }

      // Se foi falha, verificar se deve bloquear
      if (!success) {
        await this.handleFailedAttempt(email, ipAddress);
      } else {
        // Se foi sucesso, limpar tentativas falhas
        await this.clearFailedAttempts(email, ipAddress);
      }

      this.logger.info('Tentativa de login registrada', {
        email,
        ipAddress,
        success,
        failureReason,
      });

    } catch (error) {
      this.logger.error('Erro ao registrar tentativa de login', {
        error: error.message,
        email,
        ipAddress,
      });
    }
  }

  /**
   * Verificar bloqueio por IP
   */
  private async checkIPBlock(ipAddress: string): Promise<{ blocked: boolean; blockedUntil?: Date }> {
    const { data, error } = await this.supabase
      .from('security_blocks')
      .select('blocked_until')
      .eq('ip_address', ipAddress)
      .eq('block_type', 'ip')
      .gt('blocked_until', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Erro ao verificar bloqueio de IP', { error: error.message, ipAddress });
    }

    return {
      blocked: !!data,
      blockedUntil: data ? new Date(data.blocked_until) : undefined,
    };
  }

  /**
   * Verificar bloqueio por email
   */
  private async checkEmailBlock(email: string): Promise<{ blocked: boolean; blockedUntil?: Date }> {
    const { data, error } = await this.supabase
      .from('security_blocks')
      .select('blocked_until')
      .eq('email', email)
      .eq('block_type', 'email')
      .gt('blocked_until', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Erro ao verificar bloqueio de email', { error: error.message, email });
    }

    return {
      blocked: !!data,
      blockedUntil: data ? new Date(data.blocked_until) : undefined,
    };
  }

  /**
   * Verificar rate limiting
   */
  private async checkRateLimit(email: string, ipAddress: string): Promise<SecurityCheck & { recentFailures: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Contar tentativas na última hora
    const { data: hourlyAttempts, error: hourlyError } = await this.supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
      .gte('attempted_at', oneHourAgo.toISOString());

    if (hourlyError) {
      this.logger.error('Erro ao verificar tentativas por hora', { error: hourlyError.message });
      return { allowed: false, reason: 'Erro de verificação', riskLevel: 'critical', recentFailures: 0 };
    }

    // Contar tentativas no último dia
    const { data: dailyAttempts, error: dailyError } = await this.supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
      .gte('attempted_at', oneDayAgo.toISOString());

    if (dailyError) {
      this.logger.error('Erro ao verificar tentativas por dia', { error: dailyError.message });
      return { allowed: false, reason: 'Erro de verificação', riskLevel: 'critical', recentFailures: 0 };
    }

    // Contar falhas recentes
    const { data: recentFailures } = await this.supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('ip_address', ipAddress)
      .gte('attempted_at', oneHourAgo.toISOString());

    const recentFailureCount = typeof recentFailures === 'number' ? recentFailures : (Array.isArray(recentFailures) ? recentFailures.length : 0);

    // Verificar limites
    const hourlyCount = typeof hourlyAttempts === 'number' ? hourlyAttempts : (Array.isArray(hourlyAttempts) ? hourlyAttempts.length : 0);
    if (hourlyCount >= this.config.maxAttemptsPerHour) {
      return {
        allowed: false,
        reason: 'Muitas tentativas por hora. Tente novamente mais tarde',
        riskLevel: 'high',
        recentFailures: recentFailureCount,
      };
    }

    const dailyCount = typeof dailyAttempts === 'number' ? dailyAttempts : (Array.isArray(dailyAttempts) ? dailyAttempts.length : 0);
    if (dailyCount >= this.config.maxAttemptsPerDay) {
      return {
        allowed: false,
        reason: 'Limite diário de tentativas excedido',
        riskLevel: 'high',
        recentFailures: recentFailureCount,
      };
    }

    return {
      allowed: true,
      riskLevel: recentFailureCount > 2 ? 'medium' : 'low',
      recentFailures: recentFailureCount,
    };
  }

  /**
   * Verificar atividade suspeita
   */
  private async checkSuspiciousActivity(email: string, ipAddress: string): Promise<{ riskLevel: 'low' | 'medium' | 'high' | 'critical' }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Verificar múltiplos IPs para o mesmo email
    const { data: uniqueIPs, error } = await this.supabase
      .from('login_attempts')
      .select('ip_address')
      .eq('email', email)
      .gte('attempted_at', last24Hours.toISOString());

    if (error) {
      this.logger.error('Erro ao verificar atividade suspeita', { error: error.message });
      return { riskLevel: 'medium' };
    }

    const uniqueIPCount = new Set(uniqueIPs?.map(attempt => attempt.ip_address)).size;

    if (uniqueIPCount >= this.config.suspiciousActivityThreshold) {
      this.logger.warn('Atividade suspeita detectada', {
        email,
        uniqueIPCount,
        currentIP: ipAddress,
      });
      return { riskLevel: 'high' };
    }

    return { riskLevel: uniqueIPCount > 1 ? 'medium' : 'low' };
  }

  /**
   * Lidar com tentativa falha
   */
  private async handleFailedAttempt(email: string, ipAddress: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Contar falhas recentes para este email
    const { data: emailFailures, error: emailError } = await this.supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('success', false)
      .gte('attempted_at', oneHourAgo.toISOString());

    // Contar falhas recentes para este IP
    const { data: ipFailures, error: ipError } = await this.supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .eq('success', false)
      .gte('attempted_at', oneHourAgo.toISOString());

    const emailCount = typeof emailFailures === 'number' ? emailFailures : (Array.isArray(emailFailures) ? emailFailures.length : 0);
    const ipCount = typeof ipFailures === 'number' ? ipFailures : (Array.isArray(ipFailures) ? ipFailures.length : 0);

    if (!emailError && emailCount >= this.config.maxFailedAttempts) {
      await this.blockEmail(email);
    }

    if (!ipError && ipCount >= this.config.maxFailedAttempts * 2) {
      await this.blockIP(ipAddress);
    }
  }

  /**
   * Bloquear email
   */
  private async blockEmail(email: string): Promise<void> {
    const blockedUntil = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000);

    const { error } = await this.supabase
      .from('security_blocks')
      .upsert({
        email,
        block_type: 'email',
        blocked_until: blockedUntil.toISOString(),
        reason: 'Múltiplas tentativas de login falharam',
        created_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error('Erro ao bloquear email', { error: error.message, email });
    } else {
      this.logger.warn('Email bloqueado por segurança', { email, blockedUntil });
    }
  }

  /**
   * Bloquear IP
   */
  private async blockIP(ipAddress: string): Promise<void> {
    const blockedUntil = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000);

    const { error } = await this.supabase
      .from('security_blocks')
      .upsert({
        ip_address: ipAddress,
        block_type: 'ip',
        blocked_until: blockedUntil.toISOString(),
        reason: 'Múltiplas tentativas de login falharam',
        created_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error('Erro ao bloquear IP', { error: error.message, ipAddress });
    } else {
      this.logger.warn('IP bloqueado por segurança', { ipAddress, blockedUntil });
    }
  }

  /**
   * Limpar tentativas falhas após login bem-sucedido
   */
  private async clearFailedAttempts(email: string, ipAddress: string): Promise<void> {
    // Remover bloqueios ativos
    const { error: emailBlockError } = await this.supabase
      .from('security_blocks')
      .delete()
      .eq('email', email)
      .eq('block_type', 'email');

    const { error: ipBlockError } = await this.supabase
      .from('security_blocks')
      .delete()
      .eq('ip_address', ipAddress)
      .eq('block_type', 'ip');

    if (emailBlockError) {
      this.logger.error('Erro ao limpar bloqueio de email', { error: emailBlockError.message });
    }

    if (ipBlockError) {
      this.logger.error('Erro ao limpar bloqueio de IP', { error: ipBlockError.message });
    }

    this.logger.info('Bloqueios de segurança removidos após login bem-sucedido', { email, ipAddress });
  }

  /**
   * Obter estatísticas de segurança
   */
  async getSecurityStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{ totalAttempts: number; totalBlocks: number; uniqueIPs: number; timeframe: string }> {
    const timeframeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - timeframeMs[timeframe]);

    const [attempts, blocks, uniqueIPs] = await Promise.all([
      this.supabase
        .from('login_attempts')
        .select('success', { count: 'exact', head: true })
        .gte('attempted_at', since.toISOString()),
      
      this.supabase
        .from('security_blocks')
        .select('block_type', { count: 'exact', head: true })
        .gte('created_at', since.toISOString()),
      
      this.supabase
        .from('login_attempts')
        .select('ip_address')
        .gte('attempted_at', since.toISOString()),
    ]);

    return {
      totalAttempts: attempts.count || 0,
      totalBlocks: blocks.count || 0,
      uniqueIPs: new Set(uniqueIPs.data?.map(a => a.ip_address)).size,
      timeframe,
    };
  }
} 