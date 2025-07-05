-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.apostila-inteligente (
  title character varying NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  description text,
  concurso_id uuid,
  categoria_id uuid,
  disciplinas jsonb,
  slug character varying UNIQUE,
  created_by uuid,
  CONSTRAINT apostila-inteligente_pkey PRIMARY KEY (id),
  CONSTRAINT fk_apostila_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_apostila_categoria FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT fk_apostila_concurso FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.apostila_content (
  apostila_id uuid NOT NULL,
  module_number integer NOT NULL,
  title character varying NOT NULL,
  content_json jsonb NOT NULL,
  concurso_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apostila_content_pkey PRIMARY KEY (id),
  CONSTRAINT apostila_content_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
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
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cache_config (
  cache_key character varying NOT NULL UNIQUE,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ttl_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cache_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cartoes-memorizacao (
  front text NOT NULL,
  back text NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  disciplina character varying NOT NULL,
  CONSTRAINT cartoes-memorizacao_pkey PRIMARY KEY (id),
  CONSTRAINT cartoes_memorizacao_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT cartoes_memorizacao_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
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
  CONSTRAINT concursos_pkey PRIMARY KEY (id),
  CONSTRAINT concursos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);
CREATE TABLE public.mapa_assuntos (
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  disciplina character varying NOT NULL,
  CONSTRAINT mapa_assuntos_pkey PRIMARY KEY (id),
  CONSTRAINT mapa_assuntos_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT mapa_assuntos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);
CREATE TABLE public.planos_estudo (
  user_id uuid NOT NULL,
  concurso_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  schedule jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT planos_estudo_pkey PRIMARY KEY (id),
  CONSTRAINT planos_estudo_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.questoes_semanais (
  title character varying NOT NULL,
  description text,
  week_number integer NOT NULL,
  year integer NOT NULL,
  concurso_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT questoes_semanais_pkey PRIMARY KEY (id),
  CONSTRAINT questoes_semanais_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.simulado_questions (
  simulado_id uuid NOT NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  alternatives jsonb NOT NULL,
  correct_answer character varying NOT NULL,
  explanation text,
  topic character varying,
  difficulty character varying,
  deleted_at timestamp with time zone,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  disciplina character varying,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  discipline character varying,
  CONSTRAINT simulado_questions_pkey PRIMARY KEY (id),
  CONSTRAINT simulado_questions_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT simulado_questions_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT fk_simulado_questions_simulado FOREIGN KEY (simulado_id) REFERENCES public.simulados-personalizados(id)
);
CREATE TABLE public.simulados-personalizados (
  title character varying NOT NULL,
  questions_count integer NOT NULL DEFAULT 0,
  time_minutes integer NOT NULL,
  difficulty character varying NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  description text,
  concurso_id uuid,
  is_public boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  categoria_id uuid,
  disciplinas jsonb,
  slug character varying UNIQUE,
  CONSTRAINT simulados-personalizados_pkey PRIMARY KEY (id),
  CONSTRAINT fk_simulados_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_simulados_categoria FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id),
  CONSTRAINT fk_simulados_concurso FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.user_apostila_progress (
  user_id uuid NOT NULL,
  apostila_content_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completed boolean DEFAULT false,
  progress_percentage numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_apostila_progress_pkey PRIMARY KEY (id),
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
  CONSTRAINT user_concurso_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_concurso_preferences_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);
CREATE TABLE public.user_discipline_stats (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  disciplina character varying NOT NULL,
  CONSTRAINT user_discipline_stats_pkey PRIMARY KEY (id)
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
  CONSTRAINT user_flashcard_progress_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.cartoes-memorizacao(id)
);
CREATE TABLE public.user_mapa_assuntos_status (
  user_id uuid NOT NULL,
  mapa_assunto_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'não_iniciado'::character varying,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_mapa_assuntos_status_pkey PRIMARY KEY (id),
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
  CONSTRAINT user_performance_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_questoes_semanais_progress (
  user_id uuid NOT NULL,
  questoes_semanais_id uuid NOT NULL,
  score numeric NOT NULL,
  answers jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_questoes_semanais_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_questoes_semanais_progress_questoes_semanais_id_fkey FOREIGN KEY (questoes_semanais_id) REFERENCES public.questoes_semanais(id)
);
CREATE TABLE public.user_simulado_progress (
  user_id uuid NOT NULL,
  simulado_id uuid NOT NULL,
  score numeric NOT NULL,
  time_taken_minutes integer NOT NULL,
  answers jsonb NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_simulado_progress_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_simulado_progress_simulado FOREIGN KEY (simulado_id) REFERENCES public.simulados-personalizados(id),
  CONSTRAINT fk_user_simulado_progress_user FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_questions_answered integer DEFAULT 0,
  total_correct_answers integer DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  last_login timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);