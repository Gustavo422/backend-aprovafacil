-- Adiciona colunas de estatísticas do usuário
ALTER TABLE users
ADD COLUMN study_time_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN total_questions_answered INTEGER NOT NULL DEFAULT 0,
ADD COLUMN total_correct_answers INTEGER NOT NULL DEFAULT 0,
ADD COLUMN average_score NUMERIC(5,2) NOT NULL DEFAULT 0;
