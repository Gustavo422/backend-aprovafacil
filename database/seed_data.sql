-- SEED DATA for aprovaJa

-- Apagar dados existentes para evitar duplicatas
DELETE FROM public.user_simulado_progress;
DELETE FROM public.user_questoes_semanais_progress;
DELETE FROM public.user_mapa_assuntos_status;
DELETE FROM public.user_flashcard_progress;
DELETE FROM public.user_apostila_progress;
DELETE FROM public.planos_estudo;
DELETE FROM public.simulado_questions;
DELETE FROM public.questoes_semanais;
DELETE FROM public.mapa_assuntos;
DELETE FROM public.flashcards;
DELETE FROM public.apostila_content;
DELETE FROM public.apostilas;
DELETE FROM public.simulados;
DELETE FROM public.categoria_disciplinas;
DELETE FROM public.concursos;
DELETE FROM public.concurso_categorias;
DELETE FROM public.users;


-- Inserir Usuário de Teste
INSERT INTO public.users (id, email, name) VALUES
('00000000-0000-0000-0000-000000000001', 'testuser@example.com', 'Usuário de Teste');

-- Inserir Categorias de Concurso
INSERT INTO public.concurso_categorias (id, nome, slug, descricao) VALUES
('10000000-0000-0000-0000-000000000001', 'Carreiras Policiais', 'carreiras-policiais', 'Concursos para Polícia Federal, Civil, Militar, etc.'),
('10000000-0000-0000-0000-000000000002', 'Tribunais', 'tribunais', 'Concursos para Tribunais de Justiça, Trabalho, Eleitoral, etc.');

-- Inserir Concursos
INSERT INTO public.concursos (id, nome, categoria_id, ano, banca) VALUES
('20000000-0000-0000-0000-000000000001', 'Polícia Federal - Agente', '10000000-0000-0000-0000-000000000001', 2024, 'Cebraspe'),
('20000000-0000-0000-0000-000000000002', 'TRT 2ª Região - Analista', '10000000-0000-0000-0000-000000000002', 2024, 'FCC');

-- Inserir Disciplinas por Categoria
INSERT INTO public.categoria_disciplinas (id, categoria_id, nome, peso, horas_semanais) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Direito Penal', 80, 10),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Direito Processual Penal', 80, 10),
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Português', 90, 8),
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Direito do Trabalho', 90, 12),
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Direito Processual do Trabalho', 90, 12),
('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Português', 85, 8);


-- Inserir Apostilas
INSERT INTO public.apostilas (id, title, concurso_id, categoria_id, description, disciplinas) VALUES
('40000000-0000-0000-0000-000000000001', 'Apostila Completa PF - Agente', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Material completo para o concurso da Polícia Federal.', '["Direito Penal", "Direito Processual Penal", "Português"]'),
('40000000-0000-0000-0000-000000000002', 'Apostila TRT 2 - Analista', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Material focado no concurso do TRT da 2ª Região.', '["Direito do Trabalho", "Direito Processual do Trabalho", "Português"]');

-- Inserir Conteúdo das Apostilas
INSERT INTO public.apostila_content (id,apostila_id, module_number, title, content_json, concurso_id) VALUES
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001', 1, 'Inquérito Policial', '{"content": "O inquérito policial é um procedimento administrativo..."}', '20000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001', 2, 'Tipicidade', '{"content": "A tipicidade é o primeiro elemento do fato típico..."}', '20000000-0000-0000-0000-000000000001'),
('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000002', 1, 'Contrato de Trabalho', '{"content": "O contrato individual de trabalho é o acordo, tácito ou expresso..."}', '20000000-0000-0000-0000-000000000002');

-- Inserir Simulados
INSERT INTO public.simulados (id, title, concurso_id, categoria_id, description, time_minutes, difficulty, is_public) VALUES
('60000000-0000-0000-0000-000000000001', 'Simulado PF - Agente - 01', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Primeiro simulado para o concurso da Polícia Federal.', 120, 'Médio', true),
('60000000-0000-0000-0000-000000000002', 'Simulado TRT 2 - Analista - 01', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Primeiro simulado para o concurso do TRT 2ª Região.', 180, 'Difícil', true);

-- Inserir Questões dos Simulados
INSERT INTO public.simulado_questions (id, simulado_id, question_number, question_text, alternatives, correct_answer, disciplina, concurso_id) VALUES
('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 1, 'Qual o prazo para conclusão do inquérito policial, se o indiciado estiver preso?', '{"a": "10 dias", "b": "15 dias", "c": "30 dias", "d": "45 dias"}', 'a', 'Direito Processual Penal', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 2, 'O que significa "abolitio criminis"?', '{"a": "Criação de um novo crime", "b": "Extinção da punibilidade pelo perdão", "c": "Uma lei posterior que deixa de considerar um fato como criminoso", "d": "Aumento de pena"}', 'c', 'Direito Penal', '20000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 1, 'Qual o prazo para pagamento das verbas rescisórias?', '{"a": "10 dias", "b": "15 dias", "c": "30 dias", "d": "48 horas"}', 'a', 'Direito do Trabalho', '20000000-0000-0000-0000-000000000002');

-- Inserir Flashcards
INSERT INTO public.flashcards (id,front, back, tema, disciplina, concurso_id, categoria_id) VALUES
('80000000-0000-0000-0000-000000000001','Prazo para conclusão de IP (preso)', '10 dias, prorrogáveis por mais 15 em caso de extrema e comprovada necessidade (Lei de Drogas). Regra geral do CPP: 10 dias.', 'Inquérito Policial', 'Direito Processual Penal', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000002','Princípio da Insignificância', 'Excludente de tipicidade material. Requisitos: Mínima ofensividade da conduta, ausência de periculosidade social da ação, reduzido grau de reprovabilidade e inexpressividade da lesão jurídica.', 'Princípios', 'Direito Penal', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000003','Estabilidade da gestante', 'Desde a confirmação da gravidez até 5 meses após o parto.', 'Contrato de Trabalho', 'Direito do Trabalho', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');

-- Inserir Mapa de Assuntos
INSERT INTO public.mapa_assuntos (id,tema, subtema, disciplina, concurso_id, categoria_id) VALUES
('90000000-0000-0000-0000-000000000001','Direito Penal', 'Teoria do Crime', 'Direito Penal', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000002','Direito Penal', 'Penas', 'Direito Penal', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000003','Direito do Trabalho', 'Contrato de Trabalho', 'Direito do Trabalho', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');

-- Inserir Plano de Estudos
INSERT INTO public.planos_estudo (id, user_id, concurso_id, start_date, end_date, schedule) VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2024-07-01', '2024-09-30', '{
  "segunda": [{"disciplina": "Direito Penal", "start_time": "08:00", "end_time": "10:00"}, {"disciplina": "Português", "start_time": "10:30", "end_time": "12:00"}],
  "terca": [{"disciplina": "Direito Processual Penal", "start_time": "08:00", "end_time": "10:00"}, {"disciplina": "Revisão", "start_time": "10:30", "end_time": "12:00"}],
  "quarta": [{"disciplina": "Direito Penal", "start_time": "08:00", "end_time": "10:00"}, {"disciplina": "Português", "start_time": "10:30", "end_time": "12:00"}],
  "quinta": [{"disciplina": "Direito Processual Penal", "start_time": "08:00", "end_time": "10:00"}, {"disciplina": "Exercícios", "start_time": "10:30", "end_time": "12:00"}],
  "sexta": [{"disciplina": "Simulado", "start_time": "08:00", "end_time": "12:00"}]
}');

-- Inserir Questões Semanais
INSERT INTO public.questoes_semanais (id,title, description, week_number, year, concurso_id) VALUES
('b0000000-0000-0000-0000-000000000001','Questões da Semana 27 - PF', 'Foco em Direito Penal e Processual Penal.', 27, 2024, '20000000-0000-0000-0000-000000000001'),
('b0000000-0000-0000-0000-000000000002','Questões da Semana 27 - TRT', 'Foco em Direito do Trabalho.', 27, 2024, '20000000-0000-0000-0000-000000000002');

-- Inserir Progresso do Usuário (Exemplos)
-- Progresso em Apostilas
INSERT INTO public.user_apostila_progress (user_id, apostila_content_id, completed, progress_percentage) VALUES
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', true, 100);

-- Progresso em Flashcards
INSERT INTO public.user_flashcard_progress (user_id, flashcard_id, status, review_count) VALUES
('00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'aprendido', 5);

-- Progresso em Mapa de Assuntos
INSERT INTO public.user_mapa_assuntos_status (user_id, mapa_assunto_id, status) VALUES
('00000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'concluido');

-- Progresso em Simulados
INSERT INTO public.user_simulado_progress (user_id, simulado_id, score, time_taken_minutes, answers) VALUES
('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 50.0, 110, '{"1": "a", "2": "d"}');

-- Progresso em Questões Semanais
INSERT INTO public.user_questoes_semanais_progress (user_id, questoes_semanais_id, score, answers) VALUES
('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 80.0, '{"q1": "correct", "q2": "correct", "q3": "wrong"}');

-- Fim do script 