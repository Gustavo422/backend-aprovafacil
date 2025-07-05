-- ========================================
-- LIMPEZA COMPLETA DO BANCO DE DADOS
-- ========================================
-- Execute este script ANTES do database_schema.sql
-- ATENÇÃO: Este script remove TODAS as tabelas do sistema de concursos

-- ========================================
-- 1. DESABILITAR TRIGGERS E CONSTRAINTS
-- ========================================

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- ========================================
-- 2. REMOVER TABELAS DE PROGRESSO DO USUÁRIO
-- ========================================

-- Remover tabelas de progresso (em ordem para evitar problemas de FK)
DROP TABLE IF EXISTS user_apostila_progress CASCADE;
DROP TABLE IF EXISTS user_flashcard_progress CASCADE;
DROP TABLE IF EXISTS user_simulado_progress CASCADE;
DROP TABLE IF EXISTS user_concurso_preferences CASCADE;

-- ========================================
-- 3. REMOVER TABELAS DE CONTEÚDO
-- ========================================

-- Remover conteúdo das apostilas
DROP TABLE IF EXISTS apostila_content CASCADE;

-- Remover questões dos simulados
DROP TABLE IF EXISTS simulado_questions CASCADE;

-- Remover tabelas principais de conteúdo
DROP TABLE IF EXISTS apostilas CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS simulados CASCADE;

-- ========================================
-- 4. REMOVER TABELAS DE CONCURSOS
-- ========================================

-- Remover concursos
DROP TABLE IF EXISTS concursos CASCADE;

-- ========================================
-- 5. REMOVER TABELAS DE CATEGORIAS
-- ========================================

-- Remover disciplinas
DROP TABLE IF EXISTS categoria_disciplinas CASCADE;

-- Remover categorias
DROP TABLE IF EXISTS concurso_categorias CASCADE;

-- ========================================
-- 6. REMOVER OUTRAS TABELAS DO SISTEMA
-- ========================================

-- Remover tabelas de auditoria (se existirem)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Remover outras tabelas que possam existir
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS user_exam_results CASCADE;

-- ========================================
-- 7. REMOVER FUNÇÕES E TRIGGERS
-- ========================================

-- Remover função de atualização automática (se existir)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- 8. REMOVER ÍNDICES (se existirem)
-- ========================================

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

-- ========================================
-- 9. REABILITAR TRIGGERS
-- ========================================

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- ========================================
-- 10. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se as tabelas foram removidas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'auth%'
    AND tablename NOT LIKE 'storage%'
    AND tablename NOT LIKE 'realtime%'
    AND tablename NOT LIKE 'supabase%'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'information_schema%'
    AND tablename NOT IN ('schema_migrations', 'ar_internal_metadata')
ORDER BY tablename;

-- Mostrar apenas tabelas de autenticação (que devem permanecer)
SELECT 
    'Tabelas de autenticação mantidas:' as status,
    tablename
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE 'auth%' OR tablename LIKE 'storage%')
ORDER BY tablename;

-- ========================================
-- 11. MENSAGEM DE CONFIRMAÇÃO
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LIMPEZA COMPLETA REALIZADA COM SUCESSO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Todas as tabelas do sistema de concursos foram removidas.';
    RAISE NOTICE 'As tabelas de autenticação do Supabase foram preservadas.';
    RAISE NOTICE 'Agora você pode executar o database_schema.sql para criar a nova estrutura.';
    RAISE NOTICE '========================================';
END $$; 