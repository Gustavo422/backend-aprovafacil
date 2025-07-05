-- Add missing tables from online database
-- This migration adds all the tables that exist in the online database but not in local

-- 1. Add missing columns to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_questions_answered integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_correct_answers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS study_time_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_score numeric DEFAULT 0;

-- 2. Add missing columns to existing user_concurso_preferences table
ALTER TABLE public.user_concurso_preferences 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- 3. Add missing foreign key constraint to concursos (remove duplicate)
ALTER TABLE public.concursos 
DROP CONSTRAINT IF EXISTS fk_concurso_categoria;

-- 4. Create categoria_disciplinas table
CREATE TABLE IF NOT EXISTS public.categoria_disciplinas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nome character varying NOT NULL,
  peso integer NOT NULL CHECK (peso >= 1 AND peso <= 100),
  horas_semanais integer NOT NULL CHECK (horas_semanais >= 1),
  ordem integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categoria_disciplinas_pkey PRIMARY KEY (id),
  CONSTRAINT categoria_disciplinas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 5. Create apostilas table
CREATE TABLE IF NOT EXISTS public.apostilas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  concurso_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  categoria_id uuid,
  disciplinas jsonb,
  CONSTRAINT apostilas_pkey PRIMARY KEY (id),
  CONSTRAINT apostilas_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT apostilas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 6. Create apostila_content table
CREATE TABLE IF NOT EXISTS public.apostila_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apostila_id uuid NOT NULL,
  module_number integer NOT NULL,
  title character varying NOT NULL,
  content_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  concurso_id uuid,
  CONSTRAINT apostila_content_pkey PRIMARY KEY (id),
  CONSTRAINT apostila_content_apostila_id_fkey FOREIGN KEY (apostila_id) REFERENCES public.apostilas(id),
  CONSTRAINT apostila_content_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);

-- 7. Create user_apostila_progress table
CREATE TABLE IF NOT EXISTS public.user_apostila_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  apostila_content_id uuid NOT NULL,
  completed boolean DEFAULT false,
  progress_percentage numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_apostila_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_apostila_progress_apostila_content_id_fkey FOREIGN KEY (apostila_content_id) REFERENCES public.apostila_content(id)
);

-- 8. Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  front text NOT NULL,
  back text NOT NULL,
  disciplina character varying NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  concurso_id uuid,
  categoria_id uuid,
  peso_disciplina integer,
  CONSTRAINT flashcards_pkey PRIMARY KEY (id),
  CONSTRAINT flashcards_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT flashcards_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 9. Create user_flashcard_progress table
CREATE TABLE IF NOT EXISTS public.user_flashcard_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flashcard_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'não_iniciado'::character varying,
  next_review timestamp with time zone,
  review_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_flashcard_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_flashcard_progress_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id)
);

-- 10. Create mapa_assuntos table
CREATE TABLE IF NOT EXISTS public.mapa_assuntos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  disciplina character varying NOT NULL,
  tema character varying NOT NULL,
  subtema character varying,
  concurso_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  categoria_id uuid,
  peso_disciplina integer,
  CONSTRAINT mapa_assuntos_pkey PRIMARY KEY (id),
  CONSTRAINT mapa_assuntos_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT mapa_assuntos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 11. Create user_mapa_assuntos_status table
CREATE TABLE IF NOT EXISTS public.user_mapa_assuntos_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mapa_assunto_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'não_iniciado'::character varying,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_mapa_assuntos_status_pkey PRIMARY KEY (id),
  CONSTRAINT user_mapa_assuntos_status_mapa_assunto_id_fkey FOREIGN KEY (mapa_assunto_id) REFERENCES public.mapa_assuntos(id)
);

-- 12. Create planos_estudo table
CREATE TABLE IF NOT EXISTS public.planos_estudo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concurso_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  schedule jsonb NOT NULL,
  CONSTRAINT planos_estudo_pkey PRIMARY KEY (id),
  CONSTRAINT planos_estudo_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);

-- 13. Create questoes_semanais table
CREATE TABLE IF NOT EXISTS public.questoes_semanais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  week_number integer NOT NULL,
  year integer NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  concurso_id uuid,
  CONSTRAINT questoes_semanais_pkey PRIMARY KEY (id),
  CONSTRAINT questoes_semanais_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);

-- 14. Create user_questoes_semanais_progress table
CREATE TABLE IF NOT EXISTS public.user_questoes_semanais_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  questoes_semanais_id uuid NOT NULL,
  score numeric NOT NULL,
  completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  answers jsonb NOT NULL,
  CONSTRAINT user_questoes_semanais_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_questoes_semanais_progress_questoes_semanais_id_fkey FOREIGN KEY (questoes_semanais_id) REFERENCES public.questoes_semanais(id)
);

-- 15. Create simulados table
CREATE TABLE IF NOT EXISTS public.simulados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  questions_count integer NOT NULL DEFAULT 0,
  time_minutes integer NOT NULL DEFAULT 60,
  difficulty character varying NOT NULL DEFAULT 'Médio'::character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  concurso_id uuid,
  is_public boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  created_by uuid,
  categoria_id uuid,
  disciplinas jsonb,
  CONSTRAINT simulados_pkey PRIMARY KEY (id),
  CONSTRAINT simulados_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id),
  CONSTRAINT simulados_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 16. Create simulado_questions table
CREATE TABLE IF NOT EXISTS public.simulado_questions (
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

-- 17. Create user_simulado_progress table
CREATE TABLE IF NOT EXISTS public.user_simulado_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  simulado_id uuid NOT NULL,
  score numeric NOT NULL,
  completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  time_taken_minutes integer NOT NULL,
  answers jsonb NOT NULL,
  CONSTRAINT user_simulado_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_simulado_progress_simulado_id_fkey FOREIGN KEY (simulado_id) REFERENCES public.simulados(id)
);

-- 18. Create user_discipline_stats table
CREATE TABLE IF NOT EXISTS public.user_discipline_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  disciplina character varying NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  average_score numeric DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_discipline_stats_pkey PRIMARY KEY (id)
);

-- 19. Create user_performance_cache table
CREATE TABLE IF NOT EXISTS public.user_performance_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cache_key character varying NOT NULL,
  cache_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_performance_cache_pkey PRIMARY KEY (id)
);

-- 20. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action character varying NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- 21. Create cache_config table
CREATE TABLE IF NOT EXISTS public.cache_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cache_key character varying NOT NULL UNIQUE,
  ttl_minutes integer NOT NULL DEFAULT 60,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cache_config_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categoria_disciplinas_categoria_id ON public.categoria_disciplinas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_apostilas_concurso_id ON public.apostilas(concurso_id);
CREATE INDEX IF NOT EXISTS idx_apostilas_categoria_id ON public.apostilas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_apostila_content_apostila_id ON public.apostila_content(apostila_id);
CREATE INDEX IF NOT EXISTS idx_user_apostila_progress_user_id ON public.user_apostila_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_concurso_id ON public.flashcards(concurso_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_categoria_id ON public.flashcards(categoria_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcard_progress_user_id ON public.user_flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mapa_assuntos_concurso_id ON public.mapa_assuntos(concurso_id);
CREATE INDEX IF NOT EXISTS idx_mapa_assuntos_categoria_id ON public.mapa_assuntos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_user_mapa_assuntos_status_user_id ON public.user_mapa_assuntos_status(user_id);
CREATE INDEX IF NOT EXISTS idx_simulados_concurso_id ON public.simulados(concurso_id);
CREATE INDEX IF NOT EXISTS idx_simulados_categoria_id ON public.simulados(categoria_id);
CREATE INDEX IF NOT EXISTS idx_simulado_questions_simulado_id ON public.simulado_questions(simulado_id);
CREATE INDEX IF NOT EXISTS idx_user_simulado_progress_user_id ON public.user_simulado_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discipline_stats_user_id ON public.user_discipline_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);