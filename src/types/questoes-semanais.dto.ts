// DTO de Questões Semanais - Atualizado para corresponder ao schema real
export interface QuestoesSemanaDTO {
  id: string;
  titulo: string;
  descricao: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  ativo: boolean;
  data_liberacao: string;
  data_encerramento: string;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface CreateQuestoesSemanaDTO {
  titulo: string;
  descricao: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  ativo?: boolean;
  data_liberacao: string;
  data_encerramento: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UpdateQuestoesSemanaDTO {
  titulo?: string;
  descricao?: string;
  semana_numero?: number;
  week_number?: number;
  ano?: number;
  year?: number;
  ativo?: boolean;
  data_liberacao?: string;
  data_encerramento?: string;
  concurso_id?: string;
  categoria_id?: string;
}

export interface UserQuestoesSemanaProgressDTO {
  id: string;
  usuario_id: string;
  questoes_semanais_id: string;
  score: number;
  respostas_corretas: number;
  total_questoes: number;
  time_taken_minutes?: number;
  data_conclusao?: string;
  concluido_at?: string;
  respostas?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
}
