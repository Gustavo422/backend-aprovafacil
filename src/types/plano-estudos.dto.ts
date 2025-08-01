// DTO de Planos de Estudo - Atualizado para corresponder ao schema real
export interface PlanoEstudoDTO {
  id: string;
  usuario_id: string; // CORRIGIDO
  nome: string;
  descricao?: string;
  ativo: boolean;
  start_date: string;
  end_date: string;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface CreatePlanoEstudoDTO {
  usuario_id: string; // CORRIGIDO
  nome: string;
  descricao?: string;
  ativo?: boolean;
  start_date: string;
  end_date: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}

export interface UpdatePlanoEstudoDTO {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  start_date?: string;
  end_date?: string;
  concurso_id?: string;
  categoria_id?: string;
  schedule?: Record<string, unknown>;
}
