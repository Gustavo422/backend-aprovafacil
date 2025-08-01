// DTO de Apostilas - Atualizado para corresponder ao schema real
export interface ApostilaDTO {
  id: string;
  titulo: string;
  descricao?: string;
  concurso_id?: string;
  criado_em: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  ativo: boolean;
  atualizado_em: string;
}

export interface CreateApostilaDTO {
  titulo: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  ativo?: boolean;
}

export interface UpdateApostilaDTO {
  titulo?: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: Record<string, unknown>;
  ativo?: boolean;
}

export interface ApostilaContentDTO {
  id: string;
  apostila_id: string;
  module_number: number;
  titulo: string;
  content_json: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  ativo: boolean;
  ordem: number;
  concurso_id?: string;
}

export interface CreateApostilaContentDTO {
  apostila_id: string;
  module_number: number;
  titulo: string;
  content_json: Record<string, unknown>;
  ativo?: boolean;
  ordem?: number;
  concurso_id?: string;
}

export interface UpdateApostilaContentDTO {
  apostila_id?: string;
  module_number?: number;
  titulo?: string;
  content_json?: Record<string, unknown>;
  ativo?: boolean;
  ordem?: number;
  concurso_id?: string;
}

export interface UserApostilaProgressDTO {
  id: string;
  usuario_id: string;
  conteudo_apostila_id: string;
  concluido: boolean;
  percentual_progresso: number;
  last_accessed: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CreateUserApostilaProgressDTO {
  usuario_id: string;
  conteudo_apostila_id: string;
  concluido?: boolean;
  percentual_progresso?: number;
  last_accessed?: string;
}

export interface UpdateUserApostilaProgressDTO {
  concluido?: boolean;
  percentual_progresso?: number;
  last_accessed?: string;
}
