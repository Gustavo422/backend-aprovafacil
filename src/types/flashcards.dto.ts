// DTO de Flashcards - Atualizado para corresponder ao schema real
export interface FlashcardDTO {
  id: string;
  front: string;
  back: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
  ativo: boolean;
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
  ativo?: boolean;
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
  ativo?: boolean;
}

export interface UserFlashcardProgressDTO {
  id: string;
  usuario_id: string;
  flashcard_id: string;
  status: string;
  next_review?: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  last_reviewed?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CreateUserFlashcardProgressDTO {
  usuario_id: string;
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
