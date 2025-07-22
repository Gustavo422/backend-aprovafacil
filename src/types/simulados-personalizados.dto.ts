// DTO de Simulados Personalizados - Baseado no schema real
export interface SimuladoPersonalizadoDTO {
  id: string;
  user_id: string;
  titulo: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  questions_count?: number;
  time_minutes?: number;
  dificuldade?: string;
  deleted_at?: string;
  concurso_id?: string;
  is_public?: boolean;
  created_by?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}

export interface CreateSimuladoPersonalizadoDTO {
  user_id: string;
  titulo: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  questions_count?: number;
  time_minutes?: number;
  dificuldade?: string;
  concurso_id?: string;
  is_public?: boolean;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}

export interface UpdateSimuladoPersonalizadoDTO {
  titulo?: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  questions_count?: number;
  time_minutes?: number;
  dificuldade?: string;
  deleted_at?: string;
  concurso_id?: string;
  is_public?: boolean;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}
