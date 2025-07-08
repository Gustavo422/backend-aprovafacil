// DTO de Flashcards - Atualizado para corresponder ao schema real
export interface FlashcardDTO {
  id: string;
  front: string;
  back: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active: boolean;
}

export interface CreateFlashcardDTO {
  front: string;
  back: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active?: boolean;
}

export interface UpdateFlashcardDTO {
  front?: string;
  back?: string;
  disciplina?: string;
  tema?: string;
  subtema?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  is_active?: boolean;
}

export interface UserFlashcardProgressDTO {
  id: string;
  user_id: string;
  flashcard_id: string;
  status: string;
  next_review?: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  last_reviewed?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserFlashcardProgressDTO {
  user_id: string;
  flashcard_id: string;
  status?: string;
  next_review?: string;
  review_count?: number;
  ease_factor?: number;
  interval_days?: number;
  last_reviewed?: string;
}

export interface UpdateUserFlashcardProgressDTO {
  status?: string;
  next_review?: string;
  review_count?: number;
  ease_factor?: number;
  interval_days?: number;
  last_reviewed?: string;
}