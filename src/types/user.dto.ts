// DTO de User - Atualizado para corresponder ao schema real
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  total_questions_answered: number;
  total_correct_answers: number;
  study_time_minutes: number;
  average_score: number;
}

export interface CreateUserDTO {
  email: string;
  nome?: string;
  name?: string;
  avatar_url?: string;
}

export interface UpdateUserDTO {
  email?: string;
  nome?: string;
  name?: string;
  avatar_url?: string;
  is_active?: boolean;
}