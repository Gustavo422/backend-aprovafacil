import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICacheService, ILogService } from '../../../core/interfaces/index.js';
import { AppError } from '../../../core/errors/index.js';
import type { ListarSimuladosQuery, PaginatedDTO, QuestaoSimuladoDTO, SimuladoDetailDTO, SimuladoListItemDTO } from '../dtos/simulados.dto.js';
import type { ISimuladosRepository } from '../repositories/simulados.repository.js';
import { CacheDependencyType } from '../../../core/utils/cache-invalidation.strategy.js';

export class SimuladosService {
  private readonly repo: ISimuladosRepository;
  private readonly cache: ICacheService;
  private readonly log: ILogService;
  private readonly supabase: SupabaseClient;

  constructor(
    supabase: SupabaseClient,
    repo: ISimuladosRepository,
    cache: ICacheService,
    log: ILogService,
  ) {
    this.supabase = supabase;
    this.repo = repo;
    this.cache = cache;
    this.log = log;
  }

  async listarSimulados(query: ListarSimuladosQuery, usuarioId?: string): Promise<PaginatedDTO<SimuladoListItemDTO>> {
    // Para filtros por status, não usar cache genérico sem chavear por usuário e status
    const cacheKey = this.makeListCacheKey(query, usuarioId);
    const cached = await this.cache.obter<PaginatedDTO<SimuladoListItemDTO>>(cacheKey);
    if (!query.status && cached) return cached;

    let effectiveQuery = { ...query } as ListarSimuladosQuery;

    // Se filtro de status solicitado e há usuário, calcular o conjunto de IDs dos simulados que se enquadram
    if (usuarioId && query.status) {
      // Usar tabela-resumo declarativa de status por usuário
      const sel = this.supabase
        .from('usuario_simulado_status')
        .select('simulado_id, status')
        .eq('usuario_id', usuarioId);
      const { data: statusRows } = await sel as unknown as { data: Array<{ simulado_id: string; status: string }> | null };

      const byStatus = new Map<string, Set<string>>([
        ['finalizado', new Set()],
        ['em_andamento', new Set()],
      ]);
      const allIds = new Set<string>();
      (statusRows ?? []).forEach((r) => {
        allIds.add(r.simulado_id);
        const bucket = byStatus.get(r.status as string);
        if (bucket) bucket.add(r.simulado_id);
      });

      let idsAlvo: string[] = [];
      if (query.status === 'finalizado') {
        idsAlvo = Array.from(byStatus.get('finalizado') ?? new Set());
      } else if (query.status === 'em_andamento') {
        idsAlvo = Array.from(byStatus.get('em_andamento') ?? new Set());
      }

      if (query.status !== 'nao_iniciado') {
        effectiveQuery = { ...effectiveQuery, ids: idsAlvo };
      } else {
        // nao_iniciado: excluir IDs presentes na tabela de status do usuário
        effectiveQuery = { ...effectiveQuery, exclude_ids: Array.from(allIds) };
      }
    }

    // Buscar página base com os filtros aplicados (incluindo ids quando status != nao_iniciado)
    const page = await this.repo.listarSimulados(effectiveQuery);

    // Anexar status por item quando houver usuário
    if (usuarioId) {
      const ids = page.items.map((i) => i.id);
      if (ids.length > 0) {
        const { data: statusRows } = await this.supabase
          .from('usuario_simulado_status')
          .select('simulado_id, status')
          .eq('usuario_id', usuarioId)
          .in('simulado_id', ids);

        const statusMap = new Map<string, string>();
        (statusRows ?? []).forEach((r: any) => {
          statusMap.set(String(r.simulado_id), String(r.status));
        });

        page.items = page.items.map((it) => {
          const s = statusMap.get(it.id) as 'finalizado' | 'em_andamento' | undefined;
          const status = s ?? 'nao_iniciado';
          return { ...it, status } as any;
        });
      }
    }

    // Caching quando não houver filtro por status
    if (!query.status) {
      await this.cache.definir(cacheKey, page, 30); // TTL 30 min
    }
    return page;
  }

  async buscarDetalhePorSlug(slug: string, usuarioId?: string, concursoId?: string): Promise<SimuladoDetailDTO> {
    const cacheKey = `simulados:detail:slug:${slug}${usuarioId ? `:user:${usuarioId}` : ''}`;
    const cached = await this.cache.obter<SimuladoDetailDTO>(cacheKey);
    if (cached) return cached;

    const simulado = await this.repo.buscarPorSlug(slug, concursoId);
    if (!simulado) {
      throw new AppError('Simulado não encontrado', 404, { code: 'SIMULADO_NOT_FOUND', details: { slug } });
    }
    await this.cache.definir(cacheKey, simulado, 30);
    return simulado;
  }

  async listarQuestoesPorSimuladoId(simuladoId: string): Promise<QuestaoSimuladoDTO[]> {
    const cacheKey = `simulados:questoes:simulado:${simuladoId}`;
    const cached = await this.cache.obter<QuestaoSimuladoDTO[]>(cacheKey);
    if (cached) return cached;

    const questoes = await this.repo.listarQuestoesPorSimuladoId(simuladoId);
    await this.cache.definir(cacheKey, questoes, 30);
    return questoes;
  }

  async obterAgregados(concursoId?: string): Promise<{ por_dificuldade: Record<string, number> }> {
    const cacheKey = `simulados:agregados:${concursoId ?? 'all'}`;
    const cached = await this.cache.obter<{ por_dificuldade: Record<string, number> }>(cacheKey);
    if (cached) return cached;
    const porDificuldade = await this.repo.contarPorDificuldade(concursoId);
    const valor = { por_dificuldade: porDificuldade };
    await this.cache.definir(cacheKey, valor, 15);
    return valor;
  }

  async obterTendencias(concursoId: string): Promise<{ criados_7d: number; atualizados_7d: number }> {
    const cacheKey = `simulados:tendencias:${concursoId}`;
    const cached = await this.cache.obter<{ criados_7d: number; atualizados_7d: number }>(cacheKey);
    if (cached) return cached;
    const tendencia = await this.repo.obterTendencias(concursoId);
    await this.cache.definir(cacheKey, tendencia, 15);
    return tendencia;
  }

  private makeListCacheKey(query: ListarSimuladosQuery, usuarioId?: string): string {
    const base = ['simulados', 'list'];
    const entries = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    const params = entries.map(([k, v]) => `${k}:${v}`).join('|');
    const userKey = usuarioId ? `:user:${usuarioId}` : '';
    return `${base.join(':')}${params ? `:${params}` : ''}${userKey}`;
  }
}


