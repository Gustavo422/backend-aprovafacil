// DTO de Apostila Inteligente - Baseado no schema real
export interface ApostilaInteligenteDTO {
  id: string;
  titulo: string;
  descricao?: string;
  conteudo: Record<string, unknown>;
  concurso_id?: string;
  categoria_id?: string;
  criado_em: string;
  atualizado_em: string;
  ativo: boolean;
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
  ativo?: boolean;
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
  ativo?: boolean;
  disciplinas?: Record<string, unknown>;
  slug?: string;
  created_by?: string;
}
