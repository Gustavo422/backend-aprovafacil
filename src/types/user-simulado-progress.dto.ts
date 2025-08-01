// DTO de Progresso de Simulado do Usuário - Atualizado para corresponder ao schema real
export interface UsuarioSimuladoProgressDTO {
  id: string;
  usuario_id: string;
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
  is_concluido: boolean;
  criado_em: string;
  atualizado_em: string;
  time_taken_minutes?: number;
  concluido_at?: string;
}

export interface CreateusuariosimuladoProgressDTO {
  usuario_id: string;
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
  is_concluido?: boolean;
  time_taken_minutes?: number;
  concluido_at?: string;
}

export interface UpdateusuariosimuladoProgressDTO {
  end_time?: string;
  time_taken_seconds?: number;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  pontuacao?: number;
  score?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
  is_concluido?: boolean;
  time_taken_minutes?: number;
  concluido_at?: string;
}
