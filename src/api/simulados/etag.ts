// ETag utilities for simulados module

export function computeListEtag(params: {
  concursoId?: string | null;
  page: number | string;
  limit: number | string;
  dificuldade?: string | null;
  search?: string | null;
  status?: string | null;
  lastUpdated?: string | null;
}): string {
  const base = `${params.concursoId ?? 'nc'}:${params.page}:${params.limit}:${params.dificuldade ?? 'all'}:${params.search ?? 'none'}:${params.status ?? 'none'}:${params.lastUpdated ?? '0'}`;
  return `W/"list:${base}"`;
}

export function computeSimuladoDetailEtag(metaRevision?: number | null, questoesRevision?: number | null): string {
  const m = Number.isFinite(metaRevision ?? NaN) ? Number(metaRevision) : 0;
  const q = Number.isFinite(questoesRevision ?? NaN) ? Number(questoesRevision) : 0;
  return `W/"m:${m}|q:${q}"`;
}

export function computeQuestoesEtag(questoesRevision?: number | null): string {
  const q = Number.isFinite(questoesRevision ?? NaN) ? Number(questoesRevision) : 0;
  return `W/"q:${q}"`;
}


