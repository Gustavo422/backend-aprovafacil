-- Initial schema migration
-- This file contains all the tables and structure needed for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables in the correct order to avoid foreign key issues

-- 1. Concurso Categories (no dependencies)
CREATE TABLE public.concurso_categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  descricao text,
  cor_primaria character varying DEFAULT '#2563EB'::character varying,
  cor_secundaria character varying DEFAULT '#1E40AF'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT concurso_categorias_pkey PRIMARY KEY (id)
);

-- 2. Concursos (depends on concurso_categorias)
CREATE TABLE public.concursos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  descricao text,
  ano integer,
  banca character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  categoria_id uuid,
  edital_url text,
  data_prova date,
  vagas integer,
  salario numeric,
  CONSTRAINT concursos_pkey PRIMARY KEY (id),
  CONSTRAINT concursos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.concurso_categorias(id)
);

-- 3. Users table (for user management)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  nome character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 4. User Concurso Preferences (depends on users and concursos)
CREATE TABLE public.user_concurso_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concurso_id uuid NOT NULL,
  selected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  can_change_until timestamp with time zone NOT NULL,
  CONSTRAINT user_concurso_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_concurso_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_concurso_preferences_concurso_id_fkey FOREIGN KEY (concurso_id) REFERENCES public.concursos(id)
);

-- Create indexes for better performance
CREATE INDEX idx_concurso_categorias_slug ON public.concurso_categorias(slug);
CREATE INDEX idx_concurso_categorias_active ON public.concurso_categorias(is_active);
CREATE INDEX idx_concursos_categoria_id ON public.concursos(categoria_id);
CREATE INDEX idx_concursos_active ON public.concursos(is_active);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_user_concurso_preferences_user_id ON public.user_concurso_preferences(user_id);
-- Initial schema migration