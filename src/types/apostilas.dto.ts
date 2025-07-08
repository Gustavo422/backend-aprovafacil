// DTO de Apostilas - Atualizado para corresponder ao schema real
export interface ApostilaDTO {
  id: string;
  title: string;
  description?: string;
  concurso_id?: string;
  created_at: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
}

export interface CreateApostilaDTO {
  title: string;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateApostilaDTO {
  title?: string;
  description?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ApostilaContentDTO {
  id: string;
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  order_index: number;
  concurso_id?: string;
}

export interface CreateApostilaContentDTO {
  apostila_id: string;
  module_number: number;
  title: string;
  content_json: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
  concurso_id?: string;
}

export interface UpdateApostilaContentDTO {
  apostila_id?: string;
  module_number?: number;
  title?: string;
  content_json?: Record<string, unknown>;
  is_active?: boolean;
  order_index?: number;
  concurso_id?: string;
}

export interface UserApostilaProgressDTO {
  id: string;
  user_id: string;
  apostila_content_id: string;
  completed: boolean;
  progress_percentage: number;
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserApostilaProgressDTO {
  user_id: string;
  apostila_content_id: string;
  completed?: boolean;
  progress_percentage?: number;
  last_accessed?: string;
}

export interface UpdateUserApostilaProgressDTO {
  completed?: boolean;
  progress_percentage?: number;
  last_accessed?: string;
}