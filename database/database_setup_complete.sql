-- ========================================
-- CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS
-- SISTEMA DE CONCURSOS - CONCENTRIFY
-- ========================================
-- Execute este arquivo no SQL Editor do Supabase
-- ATENÇÃO: Este script irá limpar e recriar todo o banco!

-- ========================================
-- 1. LIMPEZA COMPLETA DO BANCO
-- ========================================

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- Remover tabelas de progresso (em ordem para evitar problemas de FK)
DROP TABLE IF EXISTS user_apostila_progress CASCADE;
DROP TABLE IF EXISTS user_flashcard_progress CASCADE;
DROP TABLE IF EXISTS user_simulado_progress CASCADE;
DROP TABLE IF EXISTS user_concurso_preferences CASCADE;

-- Remover conteúdo das apostilas
DROP TABLE IF EXISTS apostila_content CASCADE;

-- Remover questões dos simulados
DROP TABLE IF EXISTS simulado_questions CASCADE;

-- Remover tabelas principais de conteúdo
DROP TABLE IF EXISTS apostilas CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS simulados CASCADE;

-- Remover concursos
DROP TABLE IF EXISTS concursos CASCADE;

-- Remover disciplinas
DROP TABLE IF EXISTS categoria_disciplinas CASCADE;

-- Remover categorias
DROP TABLE IF EXISTS concurso_categorias CASCADE;

-- Remover outras tabelas do sistema
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS user_exam_results CASCADE;
DROP TABLE IF EXISTS user_discipline_stats CASCADE;
DROP TABLE IF EXISTS cache_config CASCADE;
DROP TABLE IF EXISTS user_performance_cache CASCADE;
DROP TABLE IF EXISTS user_mapa_assuntos_status CASCADE;
DROP TABLE IF EXISTS mapa_assuntos CASCADE;
DROP TABLE IF EXISTS planos_estudo CASCADE;
DROP TABLE IF EXISTS questoes_semanais CASCADE;
DROP TABLE IF EXISTS user_questoes_semanais_progress CASCADE;

-- Remover função de atualização automática (se existir)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Remover índices que possam ter sido criados manualmente
DROP INDEX IF EXISTS idx_concursos_categoria_id CASCADE;
DROP INDEX IF EXISTS idx_simulados_categoria_id CASCADE;
DROP INDEX IF EXISTS idx_simulados_concurso_id CASCADE;
DROP INDEX IF EXISTS idx_flashcards_categoria_id CASCADE;
DROP INDEX IF EXISTS idx_flashcards_concurso_id CASCADE;
DROP INDEX IF EXISTS idx_apostilas_categoria_id CASCADE;
DROP INDEX IF EXISTS idx_apostilas_concurso_id CASCADE;
DROP INDEX IF EXISTS idx_apostila_content_apostila_id CASCADE;
DROP INDEX IF EXISTS idx_apostila_content_concurso_id CASCADE;
DROP INDEX IF EXISTS idx_user_simulado_progress_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_simulado_progress_simulado_id CASCADE;
DROP INDEX IF EXISTS idx_user_flashcard_progress_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_flashcard_progress_flashcard_id CASCADE;
DROP INDEX IF EXISTS idx_user_apostila_progress_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_apostila_progress_content_id CASCADE;
DROP INDEX IF EXISTS idx_user_concurso_preferences_user_id CASCADE;
DROP INDEX IF EXISTS idx_user_concurso_preferences_concurso_id CASCADE;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- ========================================
-- 2. SCHEMA DO BANCO DE DADOS
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- TABELAS DE CATEGORIAS
-- ========================================

-- Tabela de categorias de concurso
CREATE TABLE IF NOT EXISTS concurso_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    cor_primaria VARCHAR(7) DEFAULT '#2563EB',
    cor_secundaria VARCHAR(7) DEFAULT '#1E40AF',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de disciplinas por categoria
CREATE TABLE IF NOT EXISTS categoria_disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES concurso_categorias(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    peso INTEGER NOT NULL CHECK (peso >= 1 AND peso <= 100),
    horas_semanais INTEGER NOT NULL CHECK (horas_semanais >= 1),
    ordem INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELAS DE CONCURSOS
-- ========================================

-- Tabela de concursos
CREATE TABLE IF NOT EXISTS concursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    ano INTEGER,
    banca VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    edital_url TEXT,
    data_prova DATE,
    vagas INTEGER,
    salario DECIMAL(10,2)
);

-- ========================================
-- TABELAS DE CONTEÚDO
-- ========================================

-- Tabela de simulados
CREATE TABLE IF NOT EXISTS simulados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    questions_count INTEGER NOT NULL DEFAULT 0,
    time_minutes INTEGER NOT NULL DEFAULT 60,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Médio',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    disciplinas JSONB
);

-- Tabela de questões dos simulados
CREATE TABLE IF NOT EXISTS simulado_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    alternatives JSONB NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    explanation TEXT,
    discipline VARCHAR(100),
    topic VARCHAR(100),
    difficulty VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    disciplina VARCHAR(100),
    peso_disciplina INTEGER
);

-- Tabela de flashcards (REFATORADA)
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    tema VARCHAR(100) NOT NULL,
    subtema VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    peso_disciplina INTEGER
);

-- Tabela de apostilas
CREATE TABLE IF NOT EXISTS apostilas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    disciplinas JSONB
);

-- Tabela de conteúdo das apostilas
CREATE TABLE IF NOT EXISTS apostila_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apostila_id UUID NOT NULL REFERENCES apostilas(id) ON DELETE CASCADE,
    module_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL
);

-- Tabela de mapa de assuntos
CREATE TABLE IF NOT EXISTS mapa_assuntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina VARCHAR(100) NOT NULL,
    tema VARCHAR(100) NOT NULL,
    subtema VARCHAR(100),
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    peso_disciplina INTEGER
);

-- ========================================
-- TABELAS DE PROGRESSO DO USUÁRIO
-- ========================================

-- Tabela de preferências de concurso do usuário
CREATE TABLE IF NOT EXISTS user_concurso_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    can_change_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de progresso de simulados
CREATE TABLE IF NOT EXISTS user_simulado_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_taken_minutes INTEGER NOT NULL,
    answers JSONB NOT NULL
);

-- Tabela de progresso de flashcards
CREATE TABLE IF NOT EXISTS user_flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'não_iniciado',
    next_review TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de progresso de apostilas
CREATE TABLE IF NOT EXISTS user_apostila_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    apostila_content_id UUID NOT NULL REFERENCES apostila_content(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de status do mapa de assuntos
CREATE TABLE IF NOT EXISTS user_mapa_assuntos_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mapa_assunto_id UUID NOT NULL REFERENCES mapa_assuntos(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'não_iniciado',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABELAS ADICIONAIS
-- ========================================

-- Tabela de questões semanais
CREATE TABLE IF NOT EXISTS questoes_semanais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL
);

-- Tabela de progresso das questões semanais
CREATE TABLE IF NOT EXISTS user_questoes_semanais_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    questoes_semanais_id UUID NOT NULL REFERENCES questoes_semanais(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answers JSONB NOT NULL
);

-- Tabela de planos de estudo
CREATE TABLE IF NOT EXISTS planos_estudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    schedule JSONB NOT NULL
);

-- Tabela de cache de performance
CREATE TABLE IF NOT EXISTS user_performance_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações de cache
CREATE TABLE IF NOT EXISTS cache_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    ttl_minutes INTEGER NOT NULL DEFAULT 60,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de estatísticas por disciplina
CREATE TABLE IF NOT EXISTS user_discipline_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. TRIGGERS E ÍNDICES
-- ========================================

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_concurso_categorias_updated_at BEFORE UPDATE ON concurso_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categoria_disciplinas_updated_at BEFORE UPDATE ON categoria_disciplinas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_concursos_updated_at BEFORE UPDATE ON concursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_simulados_updated_at BEFORE UPDATE ON simulados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_simulado_questions_updated_at BEFORE UPDATE ON simulado_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apostilas_updated_at BEFORE UPDATE ON apostilas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apostila_content_updated_at BEFORE UPDATE ON apostila_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mapas_assuntos_updated_at BEFORE UPDATE ON mapa_assuntos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_concurso_preferences_updated_at BEFORE UPDATE ON user_concurso_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_flashcard_progress_updated_at BEFORE UPDATE ON user_flashcard_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_apostila_progress_updated_at BEFORE UPDATE ON user_apostila_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_mapa_assuntos_status_updated_at BEFORE UPDATE ON user_mapa_assuntos_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questoes_semanais_updated_at BEFORE UPDATE ON questoes_semanais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planos_estudo_updated_at BEFORE UPDATE ON planos_estudo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_performance_cache_updated_at BEFORE UPDATE ON user_performance_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cache_config_updated_at BEFORE UPDATE ON cache_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_discipline_stats_updated_at BEFORE UPDATE ON user_discipline_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_concursos_categoria_id ON concursos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_concursos_is_active ON concursos(is_active);
CREATE INDEX IF NOT EXISTS idx_simulados_categoria_id ON simulados(categoria_id);
CREATE INDEX IF NOT EXISTS idx_simulados_concurso_id ON simulados(concurso_id);
CREATE INDEX IF NOT EXISTS idx_simulados_is_public ON simulados(is_public);
CREATE INDEX IF NOT EXISTS idx_simulados_deleted_at ON simulados(deleted_at);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_simulado_id ON simulado_questions(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_concurso_id ON simulado_questions(concurso_id);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_disciplina ON simulado_questions(disciplina);
CREATE INDEX IF NOT EXISTS idx_flashcards_categoria_id ON flashcards(categoria_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_concurso_id ON flashcards(concurso_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_disciplina ON flashcards(disciplina);
CREATE INDEX IF NOT EXISTS idx_apostilas_categoria_id ON apostilas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_apostilas_concurso_id ON apostilas(concurso_id);
CREATE INDEX IF NOT EXISTS idx_apostila_content_apostila_id ON apostila_content(apostila_id);
CREATE INDEX IF NOT EXISTS idx_apostila_content_concurso_id ON apostila_content(concurso_id);
CREATE INDEX IF NOT EXISTS idx_mapa_assuntos_categoria_id ON mapa_assuntos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mapa_assuntos_concurso_id ON mapa_assuntos(concurso_id);
CREATE INDEX IF NOT EXISTS idx_mapa_assuntos_disciplina ON mapa_assuntos(disciplina);
CREATE INDEX IF NOT EXISTS idx_user_concurso_preferences_user_id ON user_concurso_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concurso_preferences_concurso_id ON user_concurso_preferences(concurso_id);
CREATE INDEX IF NOT EXISTS idx_user_concurso_preferences_is_active ON user_concurso_preferences(is_active);
CREATE INDEX IF NOT EXISTS idx_user_simulado_progress_user_id ON user_simulado_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_simulado_progress_simulado_id ON user_simulado_progress(simulado_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_user_id ON user_flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_flashcard_id ON user_flashcard_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_user_apostila_progress_user_id ON user_apostila_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_apostila_progress_content_id ON user_apostila_progress(apostila_content_id);
CREATE INDEX IF NOT EXISTS idx_user_mapa_assuntos_status_user_id ON user_mapa_assuntos_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mapa_assuntos_status_mapa_id ON user_mapa_assuntos_status(mapa_assunto_id);
CREATE INDEX IF NOT EXISTS idx_questoes_semanais_concurso_id ON questoes_semanais(concurso_id);
CREATE INDEX IF NOT EXISTS idx_questoes_semanais_week_year ON questoes_semanais(week_number, year);
CREATE INDEX IF NOT EXISTS idx_user_questoes_semanais_progress_user_id ON user_questoes_semanais_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questoes_semanais_progress_questoes_id ON user_questoes_semanais_progress(questoes_semanais_id);
CREATE INDEX IF NOT EXISTS idx_planos_estudo_user_id ON planos_estudo(user_id);
CREATE INDEX IF NOT EXISTS idx_planos_estudo_concurso_id ON planos_estudo(concurso_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_cache_user_id ON user_performance_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_cache_key ON user_performance_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_user_performance_cache_expires_at ON user_performance_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cache_config_cache_key ON cache_config(cache_key);
CREATE INDEX IF NOT EXISTS idx_user_discipline_stats_user_id ON user_discipline_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discipline_stats_disciplina ON user_discipline_stats(disciplina);

-- ========================================
-- 4. DADOS DE EXEMPLO
-- ========================================

-- Inserir categorias de concurso
INSERT INTO concurso_categorias (nome, slug, descricao, cor_primaria, cor_secundaria) VALUES
('Guarda Municipal', 'guarda-municipal', 'Concursos para Guarda Municipal em todo o Brasil', '#2563EB', '#1E40AF'),
('Polícia Civil', 'policia-civil', 'Concursos para Polícia Civil dos estados', '#DC2626', '#B91C1C'),
('Tribunais', 'tribunais', 'Concursos para Tribunais de Justiça e Federais', '#059669', '#047857'),
('Receita Federal', 'receita-federal', 'Concursos para Receita Federal do Brasil', '#7C3AED', '#6D28D9'),
('Banco do Brasil', 'banco-brasil', 'Concursos para Banco do Brasil', '#D97706', '#B45309'),
('Correios', 'correios', 'Concursos para Empresa Brasileira de Correios e Telégrafos', '#DC2626', '#B91C1C'),
('Petrobras', 'petrobras', 'Concursos para Petrobras', '#059669', '#047857'),
('Concurso Público Geral', 'concurso-publico', 'Outros concursos públicos federais, estaduais e municipais', '#7C3AED', '#6D28D9'),
('Vestibular', 'vestibular', 'Vestibulares para universidades públicas e privadas', '#D97706', '#B45309');

-- Inserir disciplinas para Guarda Municipal
INSERT INTO categoria_disciplinas (categoria_id, nome, peso, horas_semanais, ordem) 
SELECT id, 'Português', 25, 4, 1 FROM concurso_categorias WHERE slug = 'guarda-municipal'
UNION ALL
SELECT id, 'Matemática', 20, 3, 2 FROM concurso_categorias WHERE slug = 'guarda-municipal'
UNION ALL
SELECT id, 'Direito Constitucional', 15, 3, 3 FROM concurso_categorias WHERE slug = 'guarda-municipal'
UNION ALL
SELECT id, 'Direito Administrativo', 15, 3, 4 FROM concurso_categorias WHERE slug = 'guarda-municipal'
UNION ALL
SELECT id, 'Legislação Municipal', 15, 2, 5 FROM concurso_categorias WHERE slug = 'guarda-municipal'
UNION ALL
SELECT id, 'Informática', 10, 2, 6 FROM concurso_categorias WHERE slug = 'guarda-municipal';

-- Inserir disciplinas para Polícia Civil
INSERT INTO categoria_disciplinas (categoria_id, nome, peso, horas_semanais, ordem) 
SELECT id, 'Português', 20, 3, 1 FROM concurso_categorias WHERE slug = 'policia-civil'
UNION ALL
SELECT id, 'Matemática', 15, 2, 2 FROM concurso_categorias WHERE slug = 'policia-civil'
UNION ALL
SELECT id, 'Direito Constitucional', 20, 4, 3 FROM concurso_categorias WHERE slug = 'policia-civil'
UNION ALL
SELECT id, 'Direito Penal', 25, 4, 4 FROM concurso_categorias WHERE slug = 'policia-civil'
UNION ALL
SELECT id, 'Direito Processual Penal', 20, 3, 5 FROM concurso_categorias WHERE slug = 'policia-civil';

-- Inserir concursos de exemplo
INSERT INTO concursos (nome, descricao, categoria, ano, banca, categoria_id, edital_url, data_prova, vagas, salario) VALUES
('Guarda Municipal de São Paulo 2024', 'Concurso para Guarda Municipal da cidade de São Paulo', 'Guarda Municipal', 2024, 'VUNESP', 
 (SELECT id FROM concurso_categorias WHERE slug = 'guarda-municipal'), 
 'https://www.prefeitura.sp.gov.br/guarda-municipal', '2024-08-15', 500, 3500.00),
 
('Polícia Civil de São Paulo 2024', 'Concurso para Delegado de Polícia Civil do Estado de São Paulo', 'Polícia Civil', 2024, 'VUNESP',
 (SELECT id FROM concurso_categorias WHERE slug = 'policia-civil'),
 'https://www.policiacivil.sp.gov.br/concurso', '2024-09-20', 100, 15000.00),
 
('Tribunal de Justiça de São Paulo 2024', 'Concurso para Analista Judiciário do TJ-SP', 'Tribunais', 2024, 'VUNESP',
 (SELECT id FROM concurso_categorias WHERE slug = 'tribunais'),
 'https://www.tjsp.jus.br/concurso', '2024-10-10', 200, 8000.00),
 
('Receita Federal 2024', 'Concurso para Auditor Fiscal da Receita Federal', 'Receita Federal', 2024, 'CESPE/CEBRASPE',
 (SELECT id FROM concurso_categorias WHERE slug = 'receita-federal'),
 'https://www.gov.br/receitafederal/concurso', '2024-11-05', 50, 25000.00);

-- Inserir simulados de exemplo
INSERT INTO simulados (title, description, questions_count, time_minutes, difficulty, concurso_id, categoria_id, is_public) VALUES
('Simulado Português - Guarda Municipal', 'Simulado focado em Português para concursos de Guarda Municipal', 20, 30, 'Médio',
 (SELECT id FROM concursos WHERE nome LIKE '%Guarda Municipal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'guarda-municipal'), true),
 
('Simulado Matemática - Polícia Civil', 'Simulado de Matemática para concursos de Polícia Civil', 15, 25, 'Difícil',
 (SELECT id FROM concursos WHERE nome LIKE '%Polícia Civil%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'policia-civil'), true),
 
('Simulado Direito Constitucional - Tribunais', 'Simulado de Direito Constitucional para concursos de Tribunais', 25, 40, 'Médio',
 (SELECT id FROM concursos WHERE nome LIKE '%Tribunal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'tribunais'), true);

-- Inserir flashcards de exemplo
INSERT INTO flashcards (front, back, disciplina, tema, concurso_id, categoria_id) VALUES
('Qual é a capital do Brasil?', 'Brasília', 'Geografia', 'Capitais Brasileiras',
 (SELECT id FROM concursos WHERE nome LIKE '%Guarda Municipal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'guarda-municipal')),
 
('O que é habeas corpus?', 'Remédio constitucional que protege a liberdade de locomoção', 'Direito Constitucional', 'Remédios Constitucionais',
 (SELECT id FROM concursos WHERE nome LIKE '%Polícia Civil%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'policia-civil')),
 
('Qual é a função do Poder Judiciário?', 'Aplicar a lei e julgar conflitos', 'Direito Constitucional', 'Poderes da República',
 (SELECT id FROM concursos WHERE nome LIKE '%Tribunal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'tribunais'));

-- Inserir apostilas de exemplo
INSERT INTO apostilas (title, description, concurso_id, categoria_id) VALUES
('Apostila Completa - Guarda Municipal', 'Material completo para concursos de Guarda Municipal', 
 (SELECT id FROM concursos WHERE nome LIKE '%Guarda Municipal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'guarda-municipal')),
 
('Apostila Direito Penal - Polícia Civil', 'Material específico de Direito Penal para Polícia Civil',
 (SELECT id FROM concursos WHERE nome LIKE '%Polícia Civil%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'policia-civil')),
 
('Apostila Processo Civil - Tribunais', 'Material de Processo Civil para concursos de Tribunais',
 (SELECT id FROM concursos WHERE nome LIKE '%Tribunal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'tribunais'));

-- Inserir mapa de assuntos de exemplo
INSERT INTO mapa_assuntos (disciplina, tema, subtema, concurso_id, categoria_id) VALUES
('Português', 'Morfologia', 'Classes Gramaticais',
 (SELECT id FROM concursos WHERE nome LIKE '%Guarda Municipal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'guarda-municipal')),
 
('Direito Penal', 'Teoria do Crime', 'Elementos do Crime',
 (SELECT id FROM concursos WHERE nome LIKE '%Polícia Civil%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'policia-civil')),
 
('Direito Constitucional', 'Direitos Fundamentais', 'Direitos e Garantias Individuais',
 (SELECT id FROM concursos WHERE nome LIKE '%Tribunal%' LIMIT 1),
 (SELECT id FROM concurso_categorias WHERE slug = 'tribunais'));

-- Inserir configurações de cache
INSERT INTO cache_config (cache_key, ttl_minutes, description) VALUES
('conteudo_filtrado', 30, 'Cache para conteúdo filtrado por categoria/concurso'),
('user_progress', 60, 'Cache para progresso do usuário'),
('estatisticas_dashboard', 15, 'Cache para estatísticas do dashboard'),
('categorias_concursos', 120, 'Cache para listagem de categorias e concursos');

-- ========================================
-- 5. MENSAGEM DE CONFIRMAÇÃO
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BANCO DE DADOS CONFIGURADO COM SUCESSO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Todas as tabelas foram criadas.';
    RAISE NOTICE 'Triggers e índices foram configurados.';
    RAISE NOTICE 'Dados de exemplo foram inseridos.';
    RAISE NOTICE 'O sistema de concursos está pronto para uso!';
    RAISE NOTICE '========================================';
END $$; 

