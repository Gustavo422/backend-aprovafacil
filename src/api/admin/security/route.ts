import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnhancedLogger } from '../../../lib/logging/enhanced-logging-service.js';

const router = express.Router();
const logger = getEnhancedLogger('security-api');

// Interface para dados de bloqueio
interface SecurityBlockData {
  block_type: string;
  reason: string;
  blocked_until: string;
  created_by: string;
  active: boolean;
  ip_address?: string;
  email?: string;
}

// Interface para estatísticas de IP
interface IPStats {
  success: number;
  failed: number;
  total: number;
}

// Middleware para verificar permissões de admin
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Acesso negado. Permissões de administrador necessárias.', code: 'ADMIN_REQUIRED' }
    });
  }
  next();
};

// Inicializar serviços
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/security/stats
 * Obter estatísticas de segurança
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;
    
    let startDate: Date;
    const now = new Date();
    
    switch (timeframe) {
      case 'hour':
        startDate = new Date(now.getTime() - (60 * 60 * 1000));
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      default: // day
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    }

    // Estatísticas de tentativas de login
    const { data: attempts, error: attemptsError } = await supabase
      .from('login_attempts')
      .select('*')
      .gte('attempted_at', startDate.toISOString());

    if (attemptsError) {
      throw attemptsError;
    }

    // Bloqueios ativos
    const { data: blocks, error: blocksError } = await supabase
      .from('security_blocks')
      .select('*')
      .eq('active', true)
      .gt('blocked_until', now.toISOString());

    if (blocksError) {
      throw blocksError;
    }

    // IPs únicos
    const uniqueIPs = new Set(attempts?.map(a => a.ip_address) || []);

    const stats = {
      totalAttempts: attempts?.length || 0,
      successfulAttempts: attempts?.filter(a => a.success).length || 0,
      failedAttempts: attempts?.filter(a => !a.success).length || 0,
      totalBlocks: blocks?.length || 0,
      uniqueIPs: uniqueIPs.size,
      timeframe
    };

    logger.info('Estatísticas de segurança consultadas', { 
      adminUserId: req.user.id,
      timeframe,
      stats 
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas de segurança', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * GET /api/admin/security/attempts
 * Listar tentativas de login recentes
 */
router.get('/attempts', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: attempts, error } = await supabase
      .from('login_attempts')
      .select(`
        *,
        usuario:user_id (
          nome,
          email
        )
      `)
      .order('attempted_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    logger.info('Tentativas de login consultadas', { 
      adminUserId: req.user.id,
      count: attempts?.length 
    });

    res.json({
      success: true,
      data: attempts || []
    });

  } catch (error) {
    logger.error('Erro ao obter tentativas de login', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * GET /api/admin/security/blocks
 * Listar bloqueios ativos
 */
router.get('/blocks', requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    const { data: blocks, error } = await supabase
      .from('security_blocks')
      .select('*')
      .eq('active', true)
      .gt('blocked_until', now.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    logger.info('Bloqueios de segurança consultados', { 
      adminUserId: req.user.id,
      count: blocks?.length 
    });

    res.json({
      success: true,
      data: blocks || []
    });

  } catch (error) {
    logger.error('Erro ao obter bloqueios de segurança', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * DELETE /api/admin/security/blocks/:blockId
 * Remover bloqueio específico
 */
router.delete('/blocks/:blockId', requireAdmin, async (req, res) => {
  try {
    const { blockId } = req.params;

    const { error } = await supabase
      .from('security_blocks')
      .update({ 
        active: false,
        unblocked_at: new Date().toISOString(),
        unblocked_by: req.user.id,
        unblock_reason: 'Removido pelo administrador'
      })
      .eq('id', blockId);

    if (error) {
      throw error;
    }

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        action: 'SECURITY_UNBLOCK',
        resource: 'security_block',
        resource_id: blockId,
        details: { reason: 'Removido pelo administrador' },
        ip_address: req.ip
      });

    logger.info('Bloqueio de segurança removido', { 
      adminUserId: req.user.id,
      blockId 
    });

    res.json({
      success: true,
      message: 'Bloqueio removido com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao remover bloqueio', { 
      error: error.message,
      adminUserId: req.user?.id,
      blockId: req.params.blockId 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * GET /api/admin/security/sessions
 * Listar sessões ativas
 */
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        usuario:user_id (
          nome,
          email,
          role
        )
      `)
      .eq('active', true)
      .gt('expires_at', now.toISOString())
      .order('last_activity', { ascending: false });

    if (error) {
      throw error;
    }

    // Adicionar informações extras
    const sessionsWithInfo = sessions?.map(session => ({
      ...session,
      userEmail: session.usuario?.email,
      userName: session.usuario?.nome,
      userRole: session.usuario?.role
    })) || [];

    logger.info('Sessões ativas consultadas', { 
      adminUserId: req.user.id,
      count: sessionsWithInfo.length 
    });

    res.json({
      success: true,
      data: sessionsWithInfo
    });

  } catch (error) {
    logger.error('Erro ao obter sessões ativas', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * POST /api/admin/security/sessions/:sessionId/revoke
 * Revogar sessão específica
 */
router.post('/sessions/:sessionId/revoke', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Desativar sessão
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ 
        active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: req.user.id,
        revoke_reason: 'Revogada pelo administrador'
      })
      .eq('id', sessionId);

    if (sessionError) {
      throw sessionError;
    }

    // Revogar refresh tokens relacionados
    await supabase
      .from('refresh_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: 'Sessão revogada pelo administrador'
      })
      .eq('user_id', req.params.userId); // Se tivermos o userId

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        action: 'SESSION_REVOKE',
        resource: 'user_session',
        resource_id: sessionId,
        details: { reason: 'Revogada pelo administrador' },
        ip_address: req.ip
      });

    logger.info('Sessão revogada pelo administrador', { 
      adminUserId: req.user.id,
      sessionId 
    });

    res.json({
      success: true,
      message: 'Sessão revogada com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao revogar sessão', { 
      error: error.message,
      adminUserId: req.user?.id,
      sessionId: req.params.sessionId 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * POST /api/admin/security/blocks
 * Criar novo bloqueio manualmente
 */
router.post('/blocks', requireAdmin, async (req, res) => {
  try {
    const { type, target, reason, duration } = req.body;

    if (!type || !target || !reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tipo, alvo e motivo são obrigatórios', code: 'MISSING_FIELDS' }
      });
    }

    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + (duration || 60)); // 1 hora por padrão

    const blockData: SecurityBlockData = {
      block_type: type,
      reason,
      blocked_until: blockedUntil.toISOString(),
      created_by: req.user!.id,
      active: true
    };

    if (type === 'ip') {
      blockData.ip_address = target;
    } else if (type === 'email') {
      blockData.email = target;
    }

    const { data, error } = await supabase
      .from('security_blocks')
      .insert(blockData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        action: 'SECURITY_BLOCK_CREATE',
        resource: 'security_block',
        resource_id: data.id,
        details: { type, target, reason, duration },
        ip_address: req.ip
      });

    logger.info('Bloqueio criado manualmente', { 
      adminUserId: req.user.id,
      blockId: data.id,
      type,
      target 
    });

    res.json({
      success: true,
      data,
      message: 'Bloqueio criado com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao criar bloqueio', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

/**
 * GET /api/admin/security/analytics
 * Análises avançadas de segurança
 */
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    
    let startDate: Date;
    const now = new Date();
    
    switch (timeframe) {
      case 'month':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    }

    // Análise de tentativas por hora
    const { data: attempts } = await supabase
      .from('login_attempts')
      .select('attempted_at, success, ip_address')
      .gte('attempted_at', startDate.toISOString());

    // Análise de IPs suspeitos
    const ipStats: Record<string, IPStats> = {};
    attempts?.forEach(attempt => {
      const ip = attempt.ip_address;
      if (!ipStats[ip]) {
        ipStats[ip] = { total: 0, failed: 0, success: 0 };
      }
      ipStats[ip].total++;
      if (attempt.success) {
        ipStats[ip].success++;
      } else {
        ipStats[ip].failed++;
      }
    });

    const suspiciousIPs = Object.entries(ipStats)
      .filter(([_ip, stats]) => stats.failed > 5 || (stats.failed / stats.total) > 0.8)
      .map(([ip, stats]) => ({ ip, ...stats }));

    // Tendências por horário
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      attempts: 0,
      failures: 0
    }));

    attempts?.forEach(attempt => {
      const hour = new Date(attempt.attempted_at).getHours();
      hourlyStats[hour].attempts++;
      if (!attempt.success) {
        hourlyStats[hour].failures++;
      }
    });

    const analytics = {
      suspiciousIPs,
      hourlyStats,
      totalAnalyzed: attempts?.length || 0,
      timeframe
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Erro ao gerar análises de segurança', { 
      error: error.message,
      adminUserId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: { message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }
    });
  }
});

export default router; 