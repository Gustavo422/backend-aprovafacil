// DTO de Concursos - Atualizado para corresponder ao schema real
export interface ConcursoDTO {
  id: string;
  nome: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  edital_url?: string;
  data_prova?: string;
  vagas?: number;
  salario?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// DTO para criação de concurso
export interface CreateConcursoDTO {
  nome: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id: string;
  edital_url?: string;
  data_prova?: string;
  vagas?: number;
  salario?: number;
  is_active?: boolean;
}

// DTO para atualização de concurso
export interface UpdateConcursoDTO {
  nome?: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  edital_url?: string;
  data_prova?: string;
  vagas?: number;
  salario?: number;
  is_active?: boolean;
}

// DTO para resposta de concurso com relacionamentos
export interface ConcursoWithRelationsDTO extends ConcursoDTO {
  concurso_categorias?: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string;
    cor_primaria: string;
    cor_secundaria: string;
  };
}

// DTO para filtros de busca
export interface ConcursoFiltersDTO {
  categoria_id?: string;
  ano?: number;
  banca?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// DTO para resposta paginada
export interface PaginatedConcursosResponseDTO {
  success: boolean;
  data: ConcursoWithRelationsDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 