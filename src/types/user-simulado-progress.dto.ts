// DTO de Progresso de Simulado do Usuário - Atualizado para corresponder ao schema real
export interface UserSimuladoProgressDTO {
  id: string;
  user_id: string;
  simulado_id: string;
  start_time: string;
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos: number;
  erros: number;
  em_branco: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  time_taken_minutes?: number;
  completed_at?: string;
}

export interface CreateUserSimuladoProgressDTO {
  user_id: string;
  simulado_id: string;
  start_time?: string;
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}

export interface UpdateUserSimuladoProgressDTO {
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_completed?: boolean;
  time_taken_minutes?: number;
  completed_at?: string;
}