-- Migração para Questões Semanais - Status do Usuário
-- Data: 2024-12-01
-- Objetivo: Criar tabela de status e funções para evitar corrida de avanço automático

-- Criar tabela de status do usuário
CREATE TABLE IF NOT EXISTS public.usuario_questoes_semanais_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concurso_id UUID NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  semana_atual INTEGER NOT NULL DEFAULT 1,
  inicio_semana_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fim_semana_em TIMESTAMPTZ NOT NULL,
  modo_desbloqueio TEXT NOT NULL DEFAULT 'strict' CHECK (modo_desbloqueio IN ('strict', 'accelerated')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(usuario_id, concurso_id),
  CONSTRAINT semana_atual_positive CHECK (semana_atual > 0),
  CONSTRAINT fim_semana_after_inicio CHECK (fim_semana_em > inicio_semana_em)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuario_questoes_semanais_status_usuario_concurso 
  ON public.usuario_questoes_semanais_status(usuario_id, concurso_id);

CREATE INDEX IF NOT EXISTS idx_usuario_questoes_semanais_status_fim_semana 
  ON public.usuario_questoes_semanais_status(fim_semana_em) 
  WHERE modo_desbloqueio = 'strict';

CREATE INDEX IF NOT EXISTS idx_usuario_questoes_semanais_status_modo_desbloqueio 
  ON public.usuario_questoes_semanais_status(modo_desbloqueio);

-- Função RPC para avançar semana no modo strict (evita corrida)
CREATE OR REPLACE FUNCTION public.avancar_semana_strict(
  p_usuario_id UUID,
  p_concurso_id UUID,
  p_agora TIMESTAMPTZ,
  p_duracao_dias INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_id UUID;
  v_semana_atual INTEGER;
  v_fim_semana TIMESTAMPTZ;
  v_pode_avancar BOOLEAN := FALSE;
BEGIN
  -- Usar transação para evitar corrida
  BEGIN
    -- Selecionar status com lock para update
    SELECT id, semana_atual, fim_semana_em
    INTO v_status_id, v_semana_atual, v_fim_semana
    FROM public.usuario_questoes_semanais_status
    WHERE usuario_id = p_usuario_id 
      AND concurso_id = p_concurso_id
      AND modo_desbloqueio = 'strict'
    FOR UPDATE SKIP LOCKED;
    
    -- Se não encontrou, não pode avançar
    IF v_status_id IS NULL THEN
      RETURN FALSE;
    END IF;
    
    -- Verificar se pode avançar (prazo expirou)
    v_pode_avancar := p_agora >= v_fim_semana;
    
    IF v_pode_avancar THEN
      -- Calcular nova semana
      UPDATE public.usuario_questoes_semanais_status
      SET 
        semana_atual = v_semana_atual + 1,
        inicio_semana_em = p_agora,
        fim_semana_em = p_agora + (p_duracao_dias || ' days')::INTERVAL,
        atualizado_em = p_agora
      WHERE id = v_status_id;
      
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro e retornar false
      RAISE LOG 'Erro em avancar_semana_strict: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$;

-- Função RPC para registrar conclusão de semana (encapsula transação)
CREATE OR REPLACE FUNCTION public.register_weekly_completion(
  p_usuario_id UUID,
  p_questoes_semanais_id UUID,
  p_respostas JSONB DEFAULT '[]'::JSONB,
  p_pontuacao INTEGER DEFAULT 0,
  p_tempo_minutos INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progresso_id UUID;
  v_semana_id UUID;
  v_concurso_id UUID;
  v_numero_semana INTEGER;
  v_resultado JSONB;
BEGIN
  -- Obter informações da semana
  SELECT id, concurso_id, numero_semana
  INTO v_semana_id, v_concurso_id, v_numero_semana
  FROM public.questoes_semanais
  WHERE id = p_questoes_semanais_id;
  
  IF v_semana_id IS NULL THEN
    RAISE EXCEPTION 'Semana não encontrada';
  END IF;
  
  -- Verificar se já existe progresso
  SELECT id
  INTO v_progresso_id
  FROM public.progresso_usuario_questoes_semanais
  WHERE usuario_id = p_usuario_id 
    AND questoes_semanais_id = p_questoes_semanais_id;
  
  IF v_progresso_id IS NOT NULL THEN
    -- Atualizar progresso existente
    UPDATE public.progresso_usuario_questoes_semanais
    SET 
      respostas = p_respostas,
      pontuacao = p_pontuacao,
      concluido_em = NOW(),
      atualizado_em = NOW()
    WHERE id = v_progresso_id;
  ELSE
    -- Inserir novo progresso
    INSERT INTO public.progresso_usuario_questoes_semanais (
      usuario_id,
      questoes_semanais_id,
      respostas,
      pontuacao,
      concluido_em,
      criado_em,
      atualizado_em
    ) VALUES (
      p_usuario_id,
      p_questoes_semanais_id,
      p_respostas,
      p_pontuacao,
      NOW(),
      NOW(),
      NOW()
    ) RETURNING id INTO v_progresso_id;
  END IF;
  
  -- Preparar resultado
  v_resultado := jsonb_build_object(
    'sucesso', true,
    'progresso_id', v_progresso_id,
    'semana_id', v_semana_id,
    'concurso_id', v_concurso_id,
    'numero_semana', v_numero_semana
  );
  
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'erro', SQLERRM
    );
END;
$$;

-- Adicionar RLS (Row Level Security) para a tabela de status
ALTER TABLE public.usuario_questoes_semanais_status ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuário só pode ver/editar seu próprio status
CREATE POLICY "Usuário pode ver seu próprio status" ON public.usuario_questoes_semanais_status
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuário pode inserir seu próprio status" ON public.usuario_questoes_semanais_status
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuário pode atualizar seu próprio status" ON public.usuario_questoes_semanais_status
  FOR UPDATE USING (auth.uid() = usuario_id);

-- Política para funções RPC
CREATE POLICY "Funções RPC podem acessar status" ON public.usuario_questoes_semanais_status
  FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE public.usuario_questoes_semanais_status IS 'Status do usuário em questões semanais por concurso';
COMMENT ON COLUMN public.usuario_questoes_semanais_status.semana_atual IS 'Número da semana atual do usuário';
COMMENT ON COLUMN public.usuario_questoes_semanais_status.modo_desbloqueio IS 'Política de desbloqueio: strict (por prazo) ou accelerated (por conclusão)';
COMMENT ON FUNCTION public.avancar_semana_strict IS 'Avança usuário para próxima semana no modo strict (evita corrida)';
COMMENT ON FUNCTION public.register_weekly_completion IS 'Registra conclusão de semana encapsulando transação';
