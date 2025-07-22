// DTO de Mapa de Assuntos - Atualizado para corresponder ao schema real
export interface MapaAssuntoDTO {
  id: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface CreateMapaAssuntoDTO {
  disciplina: string;
  tema: string;
  subtema?: string;
  descricao?: string;
  ordem?: number;
  ativo?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface UpdateMapaAssuntoDTO {
  disciplina?: string;
  tema?: string;
  subtema?: string;
  descricao?: string;
  ordem?: number;
  ativo?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}
