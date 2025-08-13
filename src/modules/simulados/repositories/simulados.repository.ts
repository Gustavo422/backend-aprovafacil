import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListarSimuladosQuery, PaginatedDTO, QuestaoSimuladoDTO, SimuladoDetailDTO, SimuladoListItemDTO } from '../dtos/simulados.dto.js';
import { toQuestaoSimuladoDTO, toSimuladoDetailDTO, toSimuladoListItemDTO } from '../mappers/simulados.mapper.js';

export interface ISimuladosRepository {
  listarSimulados(query: ListarSimuladosQuery): Promise<PaginatedDTO<SimuladoListItemDTO>>;
  buscarPorSlug(slug: string): Promise<SimuladoDetailDTO | null>;
  listarQuestoesPorSimuladoId(simuladoId: string): Promise<QuestaoSimuladoDTO[]>;
  listarQuestoesPorSimuladoIdPaginado(simuladoId: string, afterOrdem?: number, limit?: number): Promise<{ items: QuestaoSimuladoDTO[]; nextCursor?: number | null }>;
  buscarIdPorSlug(slug: string): Promise<string | null>;
  contarPorDificuldade(concursoId?: string): Promise<Record<string, number>>;
  obterTendencias(concursoId: string): Promise<{ criados_7d: number; atualizados_7d: number }>;
}

export class SupabaseSimuladosRepository implements ISimuladosRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async listarSimulados(query: ListarSimuladosQuery): Promise<PaginatedDTO<SimuladoListItemDTO>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let sel = this.supabase
      .from('simulados')
      .select(
        [
          'id',
          'titulo',
          'slug',
          'descricao',
          'concurso_id',
          'categoria_id',
          'numero_questoes',
          'tempo_minutos',
          'dificuldade',
          'disciplinas',
          'publico',
          'ativo',
          'atualizado_em',
        ].join(', '),
        { count: 'exact' },
      )
      .order('atualizado_em', { ascending: false });

    if (query.concurso_id) sel = sel.eq('concurso_id', query.concurso_id);
    if (query.categoria_id) sel = sel.eq('categoria_id', query.categoria_id);
    if (query.dificuldade) sel = sel.eq('dificuldade', query.dificuldade);
    if (typeof query.publico === 'boolean') sel = sel.eq('publico', query.publico);
    if (query.ids && query.ids.length > 0) sel = sel.in('id', query.ids);
    if (query.search && query.search.trim().length > 0) {
      // Busca simples por título/descrição; ideal: usar uma coluna tsvector indexada
      const like = `%${query.search}%`;
      sel = sel.or(`titulo.ilike.${like},descricao.ilike.${like}`);
    }
    if (query.exclude_ids && query.exclude_ids.length > 0) sel = sel.not('id', 'in', `(${query.exclude_ids.join(',')})`);

    const { data, error, count } = await sel.range(from, to);
    if (error) {
      throw error;
    }
    const items = (data ?? []).map((row) => toSimuladoListItemDTO(row as unknown as Record<string, unknown>));
    return {
      items,
      total: count ?? items.length,
      page,
      limit,
    };
  }

  async buscarPorSlug(slug: string): Promise<SimuladoDetailDTO | null> {
    const { data, error } = await this.supabase
      .from('simulados')
      .select(
        [
          'id',
          'titulo',
          'slug',
          'descricao',
          'concurso_id',
          'categoria_id',
          'numero_questoes',
          'tempo_minutos',
          'dificuldade',
          'disciplinas',
          'publico',
          'ativo',
          'criado_por',
          'criado_em',
          'atualizado_em',
          // meta para ETag/Last-Modified (tolerado pelo mapper)
          'meta_revision',
          'questoes_revision',
          'questoes_atualizado_em',
        ].join(', '),
      )
      .eq('slug', slug)
      .limit(1)
      .single();

    if (error) {
      if ((error as any).code === 'PGRST116') return null; // not found
      throw error;
    }
    if (!data) return null;
    return toSimuladoDetailDTO(data as unknown as Record<string, unknown>);
  }

  async listarQuestoesPorSimuladoId(simuladoId: string): Promise<QuestaoSimuladoDTO[]> {
    const { data, error } = await this.supabase
      .from('questoes_simulado')
      .select(
        [
          'id',
          'simulado_id',
          'numero_questao',
          'enunciado',
          'alternativas',
          'resposta_correta',
          'explicacao',
          'disciplina',
          'assunto',
          'dificuldade',
          'peso_disciplina',
          'ordem',
          'ativo',
          'criado_em',
          'atualizado_em',
        ].join(', '),
      )
      .eq('simulado_id', simuladoId)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => toQuestaoSimuladoDTO(row as unknown as Record<string, unknown>));
  }

  async listarQuestoesPorSimuladoIdPaginado(simuladoId: string, afterOrdem?: number, limit = 50): Promise<{ items: QuestaoSimuladoDTO[]; nextCursor?: number | null }> {
    let sel = this.supabase
      .from('questoes_simulado')
      .select(
        [
          'id',
          'simulado_id',
          'numero_questao',
          'enunciado',
          'alternativas',
          'resposta_correta',
          'explicacao',
          'disciplina',
          'assunto',
          'dificuldade',
          'peso_disciplina',
          'ordem',
          'ativo',
          'criado_em',
          'atualizado_em',
        ].join(', '),
      )
      .eq('simulado_id', simuladoId)
      .order('ordem', { ascending: true })
      .limit(limit);
    if (typeof afterOrdem === 'number') {
      sel = sel.gt('ordem', afterOrdem);
    }
    const { data, error } = await sel;
    if (error) throw error;
    const items = (data ?? []).map((row) => toQuestaoSimuladoDTO(row as unknown as Record<string, unknown>));
    const nextCursor = items.length === limit ? items[items.length - 1]?.ordem ?? null : null;
    return { items, nextCursor };
  }

  async buscarIdPorSlug(slug: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('simulados')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .single();
    if (error) {
      if ((error as any).code === 'PGRST116') return null;
      throw error;
    }
    return (data as unknown as { id: string } | null)?.id ?? null;
  }

  async contarPorDificuldade(concursoId?: string): Promise<Record<string, number>> {
    let sel = this.supabase
      .from('simulados')
      .select('dificuldade');
    if (concursoId) sel = sel.eq('concurso_id', concursoId);
    const { data, error } = await sel;
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row) => {
      const dif = String((row as any).dificuldade ?? '');
      counts[dif] = (counts[dif] ?? 0) + 1;
    });
    return counts;
  }

  async obterTendencias(concursoId: string): Promise<{ criados_7d: number; atualizados_7d: number }> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const created = await this.supabase
      .from('simulados')
      .select('id', { count: 'exact', head: true })
      .eq('concurso_id', concursoId)
      .gte('criado_em', since);
    const updated = await this.supabase
      .from('simulados')
      .select('id', { count: 'exact', head: true })
      .eq('concurso_id', concursoId)
      .gte('atualizado_em', since);
    return {
      criados_7d: created.count ?? 0,
      atualizados_7d: updated.count ?? 0,
    };
  }
}


