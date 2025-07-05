-- ========================================
-- SCHEMA COMPLETO - SISTEMA DE CONCURSOS
-- ========================================
-- Descrição: Schema limpo e organizado para sistema de estudo de concursos
-- Data: 2024-12-16
-- Autor: Sistema

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. TABELAS DE CATEGORIAS E DISCIPLINAS
-- ========================================

-- Tabela de categorias de concursos
CREATE TABLE IF NOT EXISTS concurso_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de disciplinas por categoria
CREATE TABLE IF NOT EXISTS categoria_disciplinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES concurso_categorias(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    peso INTEGER DEFAULT 1,
    horas_semanais INTEGER DEFAULT 2,
    ordem INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. TABELA DE CONCURSOS
-- ========================================

-- Tabela de concursos
CREATE TABLE IF NOT EXISTS concursos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    ano INTEGER NOT NULL,
    banca VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. TABELAS DE CONTEÚDO
-- ========================================

-- Tabela de simulados
CREATE TABLE IF NOT EXISTS simulados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    questions_count INTEGER NOT NULL DEFAULT 0,
    time_minutes INTEGER NOT NULL DEFAULT 60,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Fácil', 'Médio', 'Difícil')),
    is_public BOOLEAN DEFAULT true,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de questões dos simulados
CREATE TABLE IF NOT EXISTS simulado_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    explanation TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Fácil', 'Médio', 'Difícil')),
    disciplina VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    tema VARCHAR(100) NOT NULL,
    nivel_dificuldade VARCHAR(20) NOT NULL CHECK (nivel_dificuldade IN ('facil', 'medio', 'dificil')),
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de apostilas
CREATE TABLE IF NOT EXISTS apostilas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria_id UUID REFERENCES concurso_categorias(id) ON DELETE SET NULL,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de conteúdo das apostilas
CREATE TABLE IF NOT EXISTS apostila_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apostila_id UUID NOT NULL REFERENCES apostilas(id) ON DELETE CASCADE,
    concurso_id UUID REFERENCES concursos(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    materia VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. TABELAS DE PROGRESSO DO USUÁRIO
-- ========================================

-- Tabela de preferências do usuário
CREATE TABLE IF NOT EXISTS user_concurso_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, concurso_id)
);

-- Tabela de progresso em simulados
CREATE TABLE IF NOT EXISTS user_simulado_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_taken_minutes INTEGER CHECK (time_taken_minutes >= 0),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, simulado_id)
);

-- Tabela de progresso em flashcards
CREATE TABLE IF NOT EXISTS user_flashcard_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    tentativas INTEGER DEFAULT 0 CHECK (tentativas >= 0),
    acertos INTEGER DEFAULT 0 CHECK (acertos >= 0),
    tempo_resposta INTEGER CHECK (tempo_resposta >= 0 OR tempo_resposta IS NULL),
    ultima_tentativa TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, flashcard_id)
);

-- Tabela de progresso em apostilas
CREATE TABLE IF NOT EXISTS user_apostila_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    apostila_content_id UUID NOT NULL REFERENCES apostila_content(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, apostila_content_id)
);

-- ========================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para foreign keys
CREATE INDEX IF NOT EXISTS idx_concursos_categoria_id ON concursos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_simulados_categoria_id ON simulados(categoria_id);
CREATE INDEX IF NOT EXISTS idx_simulados_concurso_id ON simulados(concurso_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_categoria_id ON flashcards(categoria_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_concurso_id ON flashcards(concurso_id);
CREATE INDEX IF NOT EXISTS idx_apostilas_categoria_id ON apostilas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_apostilas_concurso_id ON apostilas(concurso_id);
CREATE INDEX IF NOT EXISTS idx_apostila_content_apostila_id ON apostila_content(apostila_id);
CREATE INDEX IF NOT EXISTS idx_apostila_content_concurso_id ON apostila_content(concurso_id);

-- Índices para campos de busca
CREATE INDEX IF NOT EXISTS idx_concursos_is_active ON concursos(is_active);
CREATE INDEX IF NOT EXISTS idx_simulados_is_public ON simulados(is_public);
CREATE INDEX IF NOT EXISTS idx_simulados_deleted_at ON simulados(deleted_at);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_simulado_id ON simulado_questions(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_deleted_at ON simulado_questions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_is_active ON flashcards(is_active);
CREATE INDEX IF NOT EXISTS idx_apostilas_is_active ON apostilas(is_active);
CREATE INDEX IF NOT EXISTS idx_apostila_content_is_active ON apostila_content(is_active);

-- Índices para progresso do usuário
CREATE INDEX IF NOT EXISTS idx_user_simulado_progress_user_id ON user_simulado_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_simulado_progress_simulado_id ON user_simulado_progress(simulado_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_user_id ON user_flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_flashcard_id ON user_flashcard_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_user_apostila_progress_user_id ON user_apostila_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_apostila_progress_content_id ON user_apostila_progress(apostila_content_id);
CREATE INDEX IF NOT EXISTS idx_user_concurso_preferences_user_id ON user_concurso_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concurso_preferences_concurso_id ON user_concurso_preferences(concurso_id);

-- ========================================
-- 6. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_concurso_categorias_updated_at 
    BEFORE UPDATE ON concurso_categorias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categoria_disciplinas_updated_at 
    BEFORE UPDATE ON categoria_disciplinas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concursos_updated_at 
    BEFORE UPDATE ON concursos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulados_updated_at 
    BEFORE UPDATE ON simulados 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulado_questions_updated_at 
    BEFORE UPDATE ON simulado_questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at 
    BEFORE UPDATE ON flashcards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apostilas_updated_at 
    BEFORE UPDATE ON apostilas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apostila_content_updated_at 
    BEFORE UPDATE ON apostila_content 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_concurso_preferences_updated_at 
    BEFORE UPDATE ON user_concurso_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_simulado_progress_updated_at 
    BEFORE UPDATE ON user_simulado_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_flashcard_progress_updated_at 
    BEFORE UPDATE ON user_flashcard_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_apostila_progress_updated_at 
    BEFORE UPDATE ON user_apostila_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE concurso_categorias IS 'Categorias de concursos (ex: Guarda Municipal, Polícia Civil)';
COMMENT ON TABLE categoria_disciplinas IS 'Disciplinas específicas de cada categoria de concurso';
COMMENT ON TABLE concursos IS 'Concursos específicos dentro de cada categoria';
COMMENT ON TABLE simulados IS 'Simulados de questões para estudo';
COMMENT ON TABLE simulado_questions IS 'Questões individuais de cada simulado';
COMMENT ON TABLE flashcards IS 'Flashcards para estudo com pergunta e resposta';
COMMENT ON TABLE apostilas IS 'Apostilas de estudo organizadas por concurso';
COMMENT ON TABLE apostila_content IS 'Conteúdo modular das apostilas';
COMMENT ON TABLE user_concurso_preferences IS 'Preferência do usuário por concurso específico';
COMMENT ON TABLE user_simulado_progress IS 'Progresso do usuário em simulados';
COMMENT ON TABLE user_flashcard_progress IS 'Progresso do usuário em flashcards';
COMMENT ON TABLE user_apostila_progress IS 'Progresso do usuário em apostilas'; 