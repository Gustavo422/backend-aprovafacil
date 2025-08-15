import type { HistoricoItemDTO, QuestaoDTO, RoadmapItemDTO, SemanaBasicaDTO } from '../dtos/questoes-semanais.dto.js';

function getString(value: unknown, fallback: string | null = null): string | null {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return String(value);
  } catch {
    return fallback;
  }
}

function getNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function toSemanaBasicaDTO(row: Record<string, unknown> | null | undefined): SemanaBasicaDTO | null {
  if (!row) return null;
  return {
    id: getString(row['id'], '') ?? '',
    numero_semana: getNumber(row['numero_semana'], 0) ?? 0,
    ano: getNumber(row['ano'], 0) ?? 0,
    titulo: getString(row['titulo']),
    descricao: getString(row['descricao']),
  };
}

export function toQuestaoDTO(row: Record<string, unknown>): QuestaoDTO {
  return {
    id: getString(row['id'], '') ?? '',
    enunciado: getString(row['enunciado'], '') ?? '',
    alternativas: (row['alternativas'] as Record<string, unknown> | unknown[]) ?? [],
    resposta_correta: getString(row['resposta_correta']),
    explicacao: getString(row['explicacao']),
    disciplina: getString(row['disciplina']),
    assunto: getString(row['assunto']),
    dificuldade: getString(row['dificuldade']),
  };
}

export function toHistoricoItemDTO(row: Record<string, unknown>): HistoricoItemDTO {
  const qs = (row['questoes_semanais'] as Record<string, unknown> | null | undefined) ?? undefined;
  return {
    id: getString(row['id'], '') ?? '',
    numero_semana: getNumber(qs?.['numero_semana'], null),
    ano: getNumber(qs?.['ano'], null),
    concluido_em: getString(row['concluido_em'], '') ?? '',
    pontuacao: getNumber(row['pontuacao'], 0),
    total_questoes: getNumber(row['total_questoes'], 0),
  };
}

export function toRoadmapItemDTO(row: Record<string, unknown>, status: RoadmapItemDTO['status'], liberaEm?: string): RoadmapItemDTO {
  return {
    numero_semana: getNumber(row['numero_semana'], 0) ?? 0,
    status,
    ...(liberaEm ? { liberaEm } : {}),
  };
}


