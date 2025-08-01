// DTO de Simulados - Atualizado para corresponder ao schema real
export interface SimuladoDTO {
  id: string;
  titulo: string;
  descricao?: string;
  num_questoes: number;
  tempo_minutos: number;
  dificuldade: string;
  is_public: boolean;
  ativo: boolean;
  data_inicio?: string;
  data_fim?: string;
  criado_em: string;
  atualizado_em: string;
  deleted_at?: string;
  created_by?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

export interface CreateSimuladoDTO {
  titulo: string;
  descricao?: string;
  num_questoes?: number;
  tempo_minutos?: number;
  dificuldade?: string;
  is_public?: boolean;
  ativo?: boolean;
  data_inicio?: string;
  data_fim?: string;
  created_by?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

export interface UpdateSimuladoDTO {
  titulo?: string;
  descricao?: string;
  num_questoes?: number;
  tempo_minutos?: number;
  dificuldade?: string;
  is_public?: boolean;
  ativo?: boolean;
  data_inicio?: string;
  data_fim?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
}

// DTO para resposta de simulado com relacionomentos
export interface SimuladoWithRelationsDTO extends SimuladoDTO {
  categorias_concursos?: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string;
    cor_primaria: string;
    cor_secundaria: string;
  };
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano?: number;
    banca?: string;
  };
  simulado_questoes?: SimuladoQuestaoDTO[];
}

// DTO para questão de simulado
export interface SimuladoQuestaoDTO {
  id: string;
  simulado_id: string;
  enunciado: string;
  alternativas: Record<string, unknown>;
  resposta_correta: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade: string;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
  deleted_at?: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

// DTO para progresso do usuário com simulados
export interface usuariosimuladoProgressDTO {
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

// DTOs adicionais para compatibilidade
export interface CreateSimuladoQuestaoDTO {
  simulado_id: string;
  enunciado: string;
  alternativas: Record<string, unknown>;
  resposta_correta: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade?: string;
  ordem?: number;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface UpdateSimuladoQuestaoDTO {
  enunciado?: string;
  alternativas?: Record<string, unknown>;
  resposta_correta?: string;
  explicacao?: string;
  disciplina?: string;
  assunto?: string;
  dificuldade?: string;
  ordem?: number;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface CreateusuariosimuladoProgressDTO {
  usuario_id: string;
  simulado_id: string;
  start_time?: string;
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

// DTO para filtros de busca
export interface SimuladoFiltersDTO {
  concurso_id?: string;
  categoria_id?: string;
  ativo?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// DTO para resposta paginada
export interface PaginatedSimuladosResponseDTO {
  success: boolean;
  data: SimuladoWithRelationsDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO para resposta de simulado com questões
export interface SimuladoWithQuestoesDTO extends SimuladoWithRelationsDTO {
  questoes: SimuladoQuestaoDTO[];
}

// DTOs adicionais para compatibilidade com código existente
export interface CreateSimuladoDto {
  titulo: string;
  descricao?: string;
  concurso_id: string;
  categoria_disciplina_id: string;
  tempo_limite?: number; // em minutos
  total_questoes?: number;
  ativo?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateSimuladoDto {
  id: string;
  titulo?: string;
  descricao?: string;
  concurso_id?: string;
  categoria_disciplina_id?: string;
  tempo_limite?: number;
  total_questoes?: number;
  ativo?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SimuladoFiltersDto {
  concurso_id?: string;
  categoria_disciplina_id?: string;
  ativo?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'titulo' | 'criado_em' | 'atualizado_em';
  order?: 'asc' | 'desc';
}

export interface SimuladoIdDto {
  id: string;
}

export interface CreateSimuladoQuestaoDto {
  simulado_id: string;
  questao_id: string;
  ordem?: number;
  pontos?: number;
}

export interface UpdateSimuladoQuestaoDto {
  id: string;
  simulado_id?: string;
  questao_id?: string;
  ordem?: number;
  pontos?: number;
}

export interface SimuladoQuestaoIdDto {
  id: string;
}

export interface SimuladoResponseDto {
  id: string;
  titulo: string;
  descricao?: string;
  concurso_id: string;
  categoria_disciplina_id: string;
  tempo_limite?: number;
  total_questoes?: number;
  ativo: boolean;
  metadata?: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  categorias_concursos?: {
    id: string;
    nome: string;
    slug: string;
    descricao?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
  };
  concursos?: {
    id: string;
    nome: string;
    descricao?: string;
    ano: number;
    banca: string;
  };
}

export interface SimuladoQuestaoResponseDto {
  id: string;
  simulado_id: string;
  questao_id: string;
  ordem: number;
  pontos: number;
  criado_em: string;
  atualizado_em: string;
  questoes?: {
    id: string;
    enunciado: string;
    alternativas: string[];
    resposta_correta: number;
    explicacao?: string;
    nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
  };
}
