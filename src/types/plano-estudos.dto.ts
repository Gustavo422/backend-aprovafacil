// DTO de Planos de Estudo - Atualizado para corresponder ao schema real
export interface PlanoEstudoDTO {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface CreatePlanoEstudoDTO {
  user_id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  start_date: string;
  end_date: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface UpdatePlanoEstudoDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}