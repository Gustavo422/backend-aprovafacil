// DTO de Simulados Personalizados - Baseado no schema real
export interface SimuladoPersonalizadoDTO {
  id: string;
  user_id: string;
  titulo: string;
  descricao?: string;
  configuracoes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Colunas adicionais que podem ser adicionadas
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
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
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
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
  title?: string;
  description?: string;
  questions_count?: number;
  time_minutes?: number;
  difficulty?: string;
  deleted_at?: string;
  concurso_id?: string;
  is_public?: boolean;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
}