-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.apostila_content (
  apostila_id uuid NOT NULL,
  module_number integer NOT NULL,
  title character varying NOT NULL,
  content_json jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  concurso_id uuid,
  CONSTRAINT apostila_content_pkey PRIMARY KEY (id),
  CONSTRAINT apostila_content_apostila_id_fkey FOREIGN KEY (apostila_id) REFERENCES public.apostilas(id),
  CONSTRAINT apostila_content_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.apostila_inteligente (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concurso_id uuid,
  categoria_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  title character varying NOT NULL,
  description text,
  disciplinas jsonb,
  slug character varying,
  created_by uuid,
  CONSTRAINT apostila_inteligente_pkey PRIMARY KEY (id),
  CONSTRAINT apostila_inteligente_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT apostila_inteligente_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT apostila_inteligente_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.apostilas (
  title character varying NOT NULL,
  description text,
  concurso_id uuid,
  categoria_id uuid,
  disciplinas jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apostilas_pkey PRIMARY KEY (id),
  CONSTRAINT apostilas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT apostilas_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.audit_logs (
  user_id uuid,
  action character varying NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.cache_config (
  cache_key character varying NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ttl_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  description text,
  CONSTRAINT cache_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cartoes_memorizacao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  front text NOT NULL,
  back text NOT NULL,
  disciplina character varying NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cartoes_memorizacao_pkey PRIMARY KEY (id),
  CONSTRAINT cartoes_memorizacao_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT cartoes_memorizacao_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);
CREATE TABLE public.categoria_disciplinas (
  categoria_id uuid NOT NULL,
  nome character varying NOT NULL,
  peso integer NOT NULL CHECK (peso >= 1 AND peso <= 100),
  horas_semanais integer NOT NULL CHECK (horas_semanais >= 1),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ordem integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categoria_disciplinas_pkey PRIMARY KEY (id),
  CONSTRAINT categoria_disciplinas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);
CREATE TABLE public.concurso_categorias (
  nome character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  descricao text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cor_primaria character varying DEFAULT '#2563EB'::character varying,
  cor_secundaria character varying DEFAULT '#1E40AF'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT concurso_categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.concurso_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  concurso_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT concurso_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT concurso_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT concurso_preferences_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.concursos (
  nome character varying NOT NULL,
  descricao text,
  ano integer,
  banca character varying,
  categoria_id uuid,
  edital_url text,
  data_prova date,
  vagas integer,
  salario numeric,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT concursos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.flashcards (
  front text NOT NULL,
  back text NOT NULL,
  disciplina character varying NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT flashcards_pkey PRIMARY KEY (id),
  CONSTRAINT flashcards_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT flashcards_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.mapa_assuntos (
  disciplina character varying NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mapa_assuntos_pkey PRIMARY KEY (id),
  CONSTRAINT mapa_assuntos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT mapa_assuntos_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.plano_estudo_itens (
  plano_estudo_id uuid NOT NULL,
  tipo_item character varying NOT NULL,
  item_id uuid NOT NULL,
  dia_semana integer,
  completed_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ordem integer DEFAULT 0,
  tempo_estimado_minutos integer DEFAULT 30,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plano_estudo_itens_pkey PRIMARY KEY (id),
  CONSTRAINT plano_estudo_itens_plano_estudo_id_fkey FOREIGN KEY (plano_estudo_id) REFERENCES public.planos_estudo(id)
);
CREATE TABLE public.planos_estudo (
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  concurso_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  schedule jsonb NOT NULL,
  CONSTRAINT planos_estudo_pkey PRIMARY KEY (id),
  CONSTRAINT planos_estudo_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT planos_estudo_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.questoes_semanais (
  concurso_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  title character varying NOT NULL,
  description text,
  week_number integer NOT NULL,
  year integer NOT NULL,
  CONSTRAINT questoes_semanais_pkey PRIMARY KEY (id),
  CONSTRAINT questoes_semanais_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.simulado_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  simulado_id uuid NOT NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  alternatives jsonb NOT NULL,
  correct_answer character varying NOT NULL,
  explanation text,
  discipline character varying,
  topic character varying,
  difficulty character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  concurso_id uuid,
  categoria_id uuid,
  disciplina character varying,
  peso_disciplina integer,
  CONSTRAINT simulado_questions_pkey PRIMARY KEY (id),
  CONSTRAINT simulado_questions_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT simulado_questions_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id),
  CONSTRAINT simulado_questions_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.simulado_questoes (
  simulado_id uuid NOT NULL,
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL,
  resposta_correta character varying NOT NULL,
  explicacao text,
  disciplina character varying,
  assunto character varying,
  deleted_at timestamp with time zone,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dificuldade character varying DEFAULT 'Média'::character varying,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT simulado_questoes_pkey PRIMARY KEY (id),
  CONSTRAINT simulado_questoes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT simulado_questoes_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT simulado_questoes_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id)
);
CREATE TABLE public.simulados (
  titulo character varying NOT NULL,
  descricao text,
  data_inicio timestamp with time zone,
  data_fim timestamp with time zone,
  deleted_at timestamp with time zone,
  created_by uuid,
  concurso_id uuid,
  categoria_id uuid,
  disciplinas jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  num_questoes integer NOT NULL DEFAULT 0,
  tempo_minutos integer NOT NULL DEFAULT 60,
  dificuldade character varying NOT NULL DEFAULT 'Médio'::character varying,
  is_public boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT simulados_pkey PRIMARY KEY (id),
  CONSTRAINT simulados_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT simulados_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT simulados_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.simulados_personalizados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  title character varying NOT NULL,
  description text,
  questions_count integer NOT NULL DEFAULT 0,
  time_minutes integer NOT NULL DEFAULT 60,
  difficulty character varying NOT NULL DEFAULT 'Médio'::character varying,
  deleted_at timestamp with time zone,
  concurso_id uuid,
  is_public boolean DEFAULT true,
  created_by uuid,
  categoria_id uuid,
  disciplinas jsonb,
  slug character varying,
  CONSTRAINT simulados_personalizados_pkey PRIMARY KEY (id),
  CONSTRAINT simulados_personalizados_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT simulados_personalizados_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT simulados_personalizados_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);
CREATE TABLE public.user_apostila_progress (
  user_id uuid NOT NULL,
  apostila_content_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completed boolean DEFAULT false,
  progress_percentage numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_apostila_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_apostila_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_apostila_progress_apostila_content_id_fkey FOREIGN KEY (apostila_content_id) REFERENCES public.apostila_content(id)
);
CREATE TABLE public.user_concurso_preferences (
  user_id uuid NOT NULL,
  concurso_id uuid NOT NULL,
  can_change_until timestamp with time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  selected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_concurso_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_concurso_preferences_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT user_concurso_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_discipline_stats (
  user_id uuid NOT NULL,
  disciplina character varying NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_discipline_stats_pkey PRIMARY KEY (id),
  CONSTRAINT user_discipline_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_flashcard_progress (
  user_id uuid NOT NULL,
  flashcard_id uuid NOT NULL,
  next_review timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'não_iniciado'::character varying,
  review_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_flashcard_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_flashcard_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_flashcard_progress_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id)
);
CREATE TABLE public.user_mapa_assuntos_status (
  user_id uuid NOT NULL,
  mapa_assunto_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'não_iniciado'::character varying,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_mapa_assuntos_status_pkey PRIMARY KEY (id),
  CONSTRAINT user_mapa_assuntos_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_mapa_assuntos_status_mapa_assunto_id_fkey FOREIGN KEY (mapa_assunto_id) REFERENCES public.mapa_assuntos(id)
);
CREATE TABLE public.user_performance_cache (
  user_id uuid NOT NULL,
  cache_key character varying NOT NULL,
  cache_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_performance_cache_pkey PRIMARY KEY (id),
  CONSTRAINT user_performance_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_questoes_semanais_progress (
  user_id uuid NOT NULL,
  questoes_semanais_id uuid NOT NULL,
  score numeric NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  answers jsonb NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT user_questoes_semanais_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_questoes_semanais_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_questoes_semanais_progress_questoes_semanais_id_fkey FOREIGN KEY (questoes_semanais_id) REFERENCES public.questoes_semanais(id)
);
CREATE TABLE public.user_simulado_progress (
  user_id uuid NOT NULL,
  simulado_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  score numeric NOT NULL,
  time_taken_minutes integer NOT NULL,
  answers jsonb NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT user_simulado_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_simulado_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_simulado_progress_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id)
);
CREATE TABLE public.users (
  email text NOT NULL UNIQUE,
  last_login timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_questions_answered integer DEFAULT 0,
  total_correct_answers integer DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  name text NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);