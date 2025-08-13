import type { NivelDificuldade } from '../../../shared/types/index.js';

// DTOs do módulo Simulados (snake_case, idênticos ao schema do DB)

export interface SimuladoListItemDTO {
  id: string;
  titulo: string;
  slug: string;
  descricao?: string | null;
  concurso_id?: string | null;
  categoria_id?: string | null;
  numero_questoes: number;
  tempo_minutos: number;
  dificuldade: NivelDificuldade | string;
  disciplinas?: unknown; // jsonb no DB; manter flexível
  publico: boolean;
  ativo: boolean;
  atualizado_em: string; // ISO string
  // Derivado por usuário (quando listado com usuário autenticado)
  status?: 'finalizado' | 'em_andamento' | 'nao_iniciado';
}

export interface SimuladoDetailDTO extends SimuladoListItemDTO {
  criado_por?: string | null;
  criado_em: string; // ISO string
}

export interface QuestaoSimuladoDTO {
  id: string;
  simulado_id: string;
  numero_questao: number;
  enunciado: string;
  alternativas: Record<string, string>;
  resposta_correta: string;
  explicacao?: string | null;
  disciplina?: string | null;
  assunto?: string | null;
  dificuldade: string;
  peso_disciplina?: number | null;
  ordem: number;
  ativo: boolean;
  criado_em: string; // ISO string
  atualizado_em: string; // ISO string
}

export interface PaginatedDTO<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListarSimuladosQuery {
  page?: number;
  limit?: number;
  concurso_id?: string;
  categoria_id?: string;
  dificuldade?: string;
  publico?: boolean;
  search?: string;
  // Filtro adicional por status do usuário
  status?: 'finalizado' | 'em_andamento' | 'nao_iniciado';
  // Filtro interno para restringir por um conjunto de IDs
  ids?: string[];
  // Filtro interno para excluir um conjunto de IDs
  exclude_ids?: string[];
}


