// DTO de Questões Semanais - Atualizado para corresponder ao schema real
export interface QuestoesSemanaDTO {
  id: string;
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active: boolean;
  data_liberacao: string;
  data_encerramento: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface CreateQuestoesSemanaDTO {
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active?: boolean;
  data_liberacao: string;
  data_encerramento: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UpdateQuestoesSemanaDTO {
  titulo?: string;
  title?: string;
  descricao?: string;
  description?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  is_active?: boolean;
  data_liberacao?: string;
  data_encerramento?: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UserQuestoesSemanaProgressDTO {
  id: string;
  user_id: string;
  questoes_semanais_id: string;
  score: number;
  respostas_corretas: number;
  total_questoes: number;
  time_taken_minutes?: number;
  data_conclusao?: string;
  completed_at?: string;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}