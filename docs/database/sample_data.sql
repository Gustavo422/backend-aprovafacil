-- ========================================
-- DADOS DE EXEMPLO - SISTEMA DE CONCURSOS
-- ========================================
-- Execute este script APÓS o database_schema.sql

-- ========================================
-- 1. INSERIR CATEGORIAS
-- ========================================

INSERT INTO concurso_categorias (nome, slug, descricao, is_active) VALUES
('Guarda Municipal', 'guarda-municipal', 'Concursos para Guarda Municipal em todo o Brasil', true),
('Polícia Civil', 'policia-civil', 'Concursos para Polícia Civil dos estados', true),
('Polícia Militar', 'policia-militar', 'Concursos para Polícia Militar dos estados', true),
('Tribunais', 'tribunais', 'Concursos para Tribunais de Justiça e Federais', true),
('Federais', 'federais', 'Concursos para órgãos federais', true),
('Bancos', 'bancos', 'Concursos para bancos públicos', true);

-- ========================================
-- 2. INSERIR DISCIPLINAS
-- ========================================

-- Disciplinas para Guarda Municipal
INSERT INTO categoria_disciplinas (categoria_id, nome, peso, horas_semanais, ordem) 
SELECT 
    cat.id,
    disciplina,
    1,
    2,
    ordem
FROM concurso_categorias cat
CROSS JOIN (VALUES 
    ('Direito Constitucional', 1),
    ('Direito Administrativo', 2),
    ('Direito Penal', 3),
    ('Direito Processual Penal', 4),
    ('Legislação Municipal', 5),
    ('Português', 6),
    ('Matemática', 7),
    ('Informática', 8),
    ('Atualidades', 9)
) AS disciplinas(disciplina, ordem)
WHERE cat.slug = 'guarda-municipal';

-- Disciplinas para Polícia Civil
INSERT INTO categoria_disciplinas (categoria_id, nome, peso, horas_semanais, ordem) 
SELECT 
    cat.id,
    disciplina,
    1,
    2,
    ordem
FROM concurso_categorias cat
CROSS JOIN (VALUES 
    ('Direito Constitucional', 1),
    ('Direito Penal', 2),
    ('Direito Processual Penal', 3),
    ('Direito Civil', 4),
    ('Direito Processual Civil', 5),
    ('Direito Administrativo', 6),
    ('Português', 7),
    ('Matemática', 8),
    ('Informática', 9),
    ('Atualidades', 10)
) AS disciplinas(disciplina, ordem)
WHERE cat.slug = 'policia-civil';

-- Disciplinas para Tribunais
INSERT INTO categoria_disciplinas (categoria_id, nome, peso, horas_semanais, ordem) 
SELECT 
    cat.id,
    disciplina,
    1,
    2,
    ordem
FROM concurso_categorias cat
CROSS JOIN (VALUES 
    ('Direito Constitucional', 1),
    ('Direito Civil', 2),
    ('Direito Processual Civil', 3),
    ('Direito Penal', 4),
    ('Direito Processual Penal', 5),
    ('Direito Administrativo', 6),
    ('Direito do Trabalho', 7),
    ('Direito Processual do Trabalho', 8),
    ('Português', 9),
    ('Informática', 10)
) AS disciplinas(disciplina, ordem)
WHERE cat.slug = 'tribunais';

-- ========================================
-- 3. INSERIR CONCURSOS
-- ========================================

-- Guarda Municipal
INSERT INTO concursos (nome, categoria_id, ano, banca, is_active) 
SELECT 
    'Guarda Municipal de São Paulo',
    cat.id,
    2024,
    'VUNESP',
    true
FROM concurso_categorias cat 
WHERE cat.slug = 'guarda-municipal';

INSERT INTO concursos (nome, categoria_id, ano, banca, is_active) 
SELECT 
    'Guarda Municipal do Rio de Janeiro',
    cat.id,
    2024,
    'FGV',
    true
FROM concurso_categorias cat 
WHERE cat.slug = 'guarda-municipal';

-- Polícia Civil
INSERT INTO concursos (nome, categoria_id, ano, banca, is_active) 
SELECT 
    'Polícia Civil de São Paulo',
    cat.id,
    2024,
    'VUNESP',
    true
FROM concurso_categorias cat 
WHERE cat.slug = 'policia-civil';

INSERT INTO concursos (nome, categoria_id, ano, banca, is_active) 
SELECT 
    'Polícia Civil do Rio de Janeiro',
    cat.id,
    2024,
    'FGV',
    true
FROM concurso_categorias cat 
WHERE cat.slug = 'policia-civil';

-- Tribunais
INSERT INTO concursos (nome, categoria_id, ano, banca, is_active) 
SELECT 
    'Tribunal de Justiça de São Paulo',
    cat.id,
    2024,
    'VUNESP',
    true
FROM concurso_categorias cat 
WHERE cat.slug = 'tribunais';

-- ========================================
-- 4. INSERIR SIMULADOS
-- ========================================

-- Simulados para Guarda Municipal
INSERT INTO simulados (title, description, questions_count, time_minutes, difficulty, is_public, categoria_id, concurso_id)
SELECT 
    'Simulado Guarda Municipal - Direito Constitucional',
    'Simulado focado em Direito Constitucional para concursos de Guarda Municipal',
    20,
    30,
    'Médio',
    true,
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

INSERT INTO simulados (title, description, questions_count, time_minutes, difficulty, is_public, categoria_id, concurso_id)
SELECT 
    'Simulado Guarda Municipal - Direito Penal',
    'Simulado focado em Direito Penal para concursos de Guarda Municipal',
    20,
    30,
    'Médio',
    true,
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

-- Simulados para Polícia Civil
INSERT INTO simulados (title, description, questions_count, time_minutes, difficulty, is_public, categoria_id, concurso_id)
SELECT 
    'Simulado Polícia Civil - Direito Penal',
    'Simulado focado em Direito Penal para concursos de Polícia Civil',
    20,
    30,
    'Médio',
    true,
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'policia-civil'
LIMIT 1;

-- ========================================
-- 5. INSERIR FLASHCARDS
-- ========================================

-- Flashcards para Guarda Municipal
INSERT INTO flashcards (front, back, disciplina, tema, nivel_dificuldade, categoria_id, concurso_id)
SELECT 
    'O que é o princípio da legalidade?',
    'É o princípio segundo o qual não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.',
    'Direito Penal',
    'Princípios do Direito Penal',
    'medio',
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

INSERT INTO flashcards (front, back, disciplina, tema, nivel_dificuldade, categoria_id, concurso_id)
SELECT 
    'Qual é a função típica do Poder Executivo?',
    'A função típica do Poder Executivo é administrar, ou seja, executar as leis e administrar os interesses públicos.',
    'Direito Constitucional',
    'Separação dos Poderes',
    'facil',
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

-- Flashcards para Polícia Civil
INSERT INTO flashcards (front, back, disciplina, tema, nivel_dificuldade, categoria_id, concurso_id)
SELECT 
    'O que é flagrante delito?',
    'É a situação em que o agente é surpreendido na prática da infração penal ou logo após.',
    'Direito Processual Penal',
    'Flagrante',
    'medio',
    cat.id,
    c.id
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'policia-civil'
LIMIT 1;

-- ========================================
-- 6. INSERIR APOSTILAS
-- ========================================

-- Apostila para Guarda Municipal
INSERT INTO apostilas (titulo, descricao, categoria_id, concurso_id, is_active)
SELECT 
    'Apostila Completa - Guarda Municipal',
    'Apostila completa com todo o conteúdo necessário para concursos de Guarda Municipal',
    cat.id,
    c.id,
    true
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

-- Apostila para Polícia Civil
INSERT INTO apostilas (titulo, descricao, categoria_id, concurso_id, is_active)
SELECT 
    'Apostila Completa - Polícia Civil',
    'Apostila completa com todo o conteúdo necessário para concursos de Polícia Civil',
    cat.id,
    c.id,
    true
FROM concurso_categorias cat
JOIN concursos c ON c.categoria_id = cat.id
WHERE cat.slug = 'policia-civil'
LIMIT 1;

-- ========================================
-- 7. INSERIR CONTEÚDO DAS APOSTILAS
-- ========================================

-- Conteúdo da apostila de Guarda Municipal
INSERT INTO apostila_content (apostila_id, concurso_id, titulo, conteudo, ordem, materia)
SELECT 
    a.id,
    a.concurso_id,
    'Introdução ao Direito Constitucional',
    'O Direito Constitucional é o ramo do direito público que estuda os princípios e normas fundamentais do Estado...',
    1,
    'Direito Constitucional'
FROM apostilas a
JOIN concursos c ON a.concurso_id = c.id
JOIN concurso_categorias cat ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

INSERT INTO apostila_content (apostila_id, concurso_id, titulo, conteudo, ordem, materia)
SELECT 
    a.id,
    a.concurso_id,
    'Princípios do Direito Penal',
    'Os princípios do Direito Penal são fundamentais para a compreensão da matéria...',
    2,
    'Direito Penal'
FROM apostilas a
JOIN concursos c ON a.concurso_id = c.id
JOIN concurso_categorias cat ON c.categoria_id = cat.id
WHERE cat.slug = 'guarda-municipal'
LIMIT 1;

-- ========================================
-- 8. VERIFICAÇÃO FINAL
-- ========================================

-- Contar registros inseridos
SELECT 'concurso_categorias' as tabela, COUNT(*) as total FROM concurso_categorias
UNION ALL
SELECT 'categoria_disciplinas' as tabela, COUNT(*) as total FROM categoria_disciplinas
UNION ALL
SELECT 'concursos' as tabela, COUNT(*) as total FROM concursos
UNION ALL
SELECT 'simulados' as tabela, COUNT(*) as total FROM simulados
UNION ALL
SELECT 'flashcards' as tabela, COUNT(*) as total FROM flashcards
UNION ALL
SELECT 'apostilas' as tabela, COUNT(*) as total FROM apostilas
UNION ALL
SELECT 'apostila_content' as tabela, COUNT(*) as total FROM apostila_content;

-- Resumo por categoria
SELECT 
    cat.nome as categoria,
    COUNT(DISTINCT c.id) as concursos,
    COUNT(DISTINCT s.id) as simulados,
    COUNT(DISTINCT f.id) as flashcards,
    COUNT(DISTINCT a.id) as apostilas
FROM concurso_categorias cat
LEFT JOIN concursos c ON c.categoria_id = cat.id
LEFT JOIN simulados s ON s.categoria_id = cat.id
LEFT JOIN flashcards f ON f.categoria_id = cat.id
LEFT JOIN apostilas a ON a.categoria_id = cat.id
GROUP BY cat.id, cat.nome
ORDER BY cat.nome; 