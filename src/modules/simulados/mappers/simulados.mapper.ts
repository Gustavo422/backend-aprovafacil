import type { QuestaoSimuladoDTO, SimuladoDetailDTO, SimuladoListItemDTO } from '../dtos/simulados.dto.js';

// Mappers tolerantes a colunas novas: escolhem apenas campos conhecidos

function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || typeof value === 'undefined';
}

export function toSimuladoListItemDTO(row: Record<string, unknown>): SimuladoListItemDTO {
  return {
    id: String(row.id),
    titulo: String(row.titulo ?? ''),
    slug: String(row.slug ?? ''),
    descricao: isNullOrUndefined(row.descricao) ? null : String(row.descricao),
    concurso_id: isNullOrUndefined(row.concurso_id) ? null : String(row.concurso_id),
    categoria_id: isNullOrUndefined(row.categoria_id) ? null : String(row.categoria_id),
    numero_questoes: Number(row.numero_questoes ?? 0),
    tempo_minutos: Number(row.tempo_minutos ?? 0),
    dificuldade: String(row.dificuldade ?? ''),
    disciplinas: row.disciplinas ?? undefined,
    publico: Boolean(row.publico ?? true),
    ativo: Boolean(row.ativo ?? true),
    atualizado_em: String(row.atualizado_em ?? ''),
  };
}

export function toSimuladoDetailDTO(row: Record<string, unknown>): SimuladoDetailDTO {
  const base = toSimuladoListItemDTO(row);
  return {
    ...base,
    criado_por: isNullOrUndefined(row.criado_por) ? null : String(row.criado_por),
    criado_em: String(row.criado_em ?? ''),
  };
}

export function toQuestaoSimuladoDTO(row: Record<string, unknown>): QuestaoSimuladoDTO {
  return {
    id: String(row.id),
    simulado_id: String(row.simulado_id),
    numero_questao: Number(row.numero_questao ?? 0),
    enunciado: String(row.enunciado ?? ''),
    alternativas: (row.alternativas as Record<string, string>) ?? {},
    resposta_correta: String(row.resposta_correta ?? ''),
    explicacao: isNullOrUndefined(row.explicacao) ? null : String(row.explicacao),
    disciplina: isNullOrUndefined(row.disciplina) ? null : String(row.disciplina),
    assunto: isNullOrUndefined(row.assunto) ? null : String(row.assunto),
    dificuldade: String(row.dificuldade ?? ''),
    peso_disciplina: isNullOrUndefined(row.peso_disciplina) ? null : Number(row.peso_disciplina),
    ordem: Number(row.ordem ?? 0),
    ativo: Boolean(row.ativo ?? true),
    criado_em: String(row.criado_em ?? ''),
    atualizado_em: String(row.atualizado_em ?? ''),
  };
}


