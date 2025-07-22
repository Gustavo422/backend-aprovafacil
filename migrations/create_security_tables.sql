-- Migration: Create Security Tables for Enhanced Login System
-- Created: 2025-01-22

-- Tabela para registrar tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    device_fingerprint TEXT,
    location TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabela para gerenciar bloqueios de segurança
CREATE TABLE IF NOT EXISTS security_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET,
    email VARCHAR(255),
    block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('ip', 'email', 'user')),
    blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Garantir que pelo menos um identificador esteja presente
    CONSTRAINT check_identifier CHECK (
        (ip_address IS NOT NULL) OR 
        (email IS NOT NULL)
    )
);

-- Tabela para refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_fingerprint TEXT,
    device_name TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT
);

-- Tabela para sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Tabela para logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de segurança
CREATE TABLE IF NOT EXISTS security_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_security_blocks_ip ON security_blocks(ip_address, blocked_until);
CREATE INDEX IF NOT EXISTS idx_security_blocks_email ON security_blocks(email, blocked_until);
CREATE INDEX IF NOT EXISTS idx_security_blocks_type ON security_blocks(block_type, blocked_until);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(active, expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_metrics_type ON security_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_metrics_name ON security_metrics(metric_name, recorded_at DESC);

-- Função para limpar dados antigos (executar diariamente)
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS void AS $$
BEGIN
    -- Limpar tentativas de login antigas (mais de 30 dias)
    DELETE FROM login_attempts 
    WHERE attempted_at < NOW() - INTERVAL '30 days';
    
    -- Limpar bloqueios expirados
    DELETE FROM security_blocks 
    WHERE blocked_until < NOW();
    
    -- Limpar refresh tokens expirados
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR revoked = true;
    
    -- Limpar sessões expiradas
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR active = false;
    
    -- Limpar logs de auditoria antigos (mais de 90 dias)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Limpar métricas antigas (mais de 1 ano)
    DELETE FROM security_metrics 
    WHERE recorded_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

-- Policies para acesso apenas por administradores ou sistema
CREATE POLICY "Admin access to login_attempts" ON login_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role = 'admin'
        )
    );

CREATE POLICY "Admin access to security_blocks" ON security_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role = 'admin'
        )
    );

-- Users podem ver apenas seus próprios refresh tokens
CREATE POLICY "Users can manage own refresh tokens" ON refresh_tokens
    FOR ALL USING (user_id = auth.uid());

-- Users podem ver apenas suas próprias sessões
CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- Admins podem ver todos os logs de auditoria
CREATE POLICY "Admin access to audit_logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role = 'admin'
        )
    );

-- Admins podem ver métricas de segurança
CREATE POLICY "Admin access to security_metrics" ON security_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.id = auth.uid() 
            AND usuarios.role = 'admin'
        )
    );

-- Comentários nas tabelas
COMMENT ON TABLE login_attempts IS 'Registra todas as tentativas de login para análise de segurança';
COMMENT ON TABLE security_blocks IS 'Gerencia bloqueios temporários por IP ou email';
COMMENT ON TABLE refresh_tokens IS 'Armazena tokens de refresh para autenticação persistente';
COMMENT ON TABLE user_sessions IS 'Gerencia sessões ativas de usuários';
COMMENT ON TABLE audit_logs IS 'Log de auditoria de todas as ações importantes do sistema';
COMMENT ON TABLE security_metrics IS 'Métricas de segurança para monitoramento e análise'; 