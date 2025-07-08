// DTO de Apostila Inteligente - Baseado no schema real
export interface ApostilaInteligenteDTO {
  id: string;
  titulo: string;
  descricao?: string;
  conteudo: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Colunas adicionais que podem ser adicionadas
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}

export interface CreateApostilaInteligenteDTO {
  titulo: string;
  descricao?: string;
  conteudo: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  is_active?: boolean;
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}

export interface UpdateApostilaInteligenteDTO {
  titulo?: string;
  descricao?: string;
  conteudo?: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  is_active?: boolean;
  title?: string;
  description?: string;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}