// DTO de Mapa de Assuntos - Atualizado para corresponder ao schema real
export interface MapaAssuntoDTO {
  id: string;
  disciplina: string;
  tema: string;
  subtema?: string;
  description?: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface CreateMapaAssuntoDTO {
  disciplina: string;
  tema: string;
  subtema?: string;
  description?: string;
  ordem?: number;
  is_active?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}

export interface UpdateMapaAssuntoDTO {
  disciplina?: string;
  tema?: string;
  subtema?: string;
  description?: string;
  ordem?: number;
  is_active?: boolean;
  concurso_id?: string;
  categoria_id?: string;
  peso_disciplina?: number;
}