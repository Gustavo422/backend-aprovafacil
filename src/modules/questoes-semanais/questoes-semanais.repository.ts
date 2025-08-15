import type { SupabaseClient } from '@supabase/supabase-js';
import type { HistoricoItemDTO, QuestaoDTO, RoadmapItemDTO, SemanaBasicaDTO } from './dtos/questoes-semanais.dto.js';
import { QuestoesSemanaisStatusService } from './questoes-semanais-status.service.js';

export interface IQuestoesSemanaisRepository {
  buscarSemanaAtual(concursoId: string): Promise<{
    semana: SemanaBasicaDTO | null;
    questoes: QuestaoDTO[];
  }>;
  listarHistorico(usuarioId: string, concursoId: string, cursor?: string, limit?: number): Promise<{ items: HistoricoItemDTO[]; nextCursor: string | null }>;
  obterRoadmap(usuarioId: string, concursoId: string): Promise<RoadmapItemDTO[]>;
  obterSemanaIdPorNumero(concursoId: string, numeroSemana: number): Promise<string | null>;
  upsertConclusaoSemana(usuarioId: string, semanaId: string, payload: { respostas?: unknown[]; pontuacao?: number; tempo_minutos?: number }): Promise<{
    sucesso: boolean;
    proximaSemana?: number;
    avancou: boolean;
  }>;
}

export class SupabaseQuestoesSemanaisRepository implements IQuestoesSemanaisRepository {
  private readonly supabase: SupabaseClient;
  private readonly statusService: QuestoesSemanaisStatusService;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.statusService = new QuestoesSemanaisStatusService(supabaseClient);
  }

  async buscarSemanaAtual(concursoId: string): Promise<{ semana: SemanaBasicaDTO | null; questoes: QuestaoDTO[]; }> {
    // Caso-limite: sem semanas no concurso
    const { data: atual, error: errAtual } = await this.supabase
      .from('questoes_semanais')
      .select('id, numero_semana, ano, titulo, descricao, questoes')
      .eq('concurso_id', concursoId)
      .eq('ativo', true)
      .order('data_publicacao', { ascending: false })
      .limit(1)
      .single();

    if (errAtual) {
      // Se não há semanas, retornar dados vazios (caso-limite coberto)
      if ((errAtual as any)?.code === 'PGRST116') {
        return { semana: null, questoes: [] };
      }
      throw new Error((errAtual as { message?: string } | null)?.message ?? 'Erro ao buscar semana atual');
    }

    const semana: SemanaBasicaDTO | null = atual ? {
      id: (atual as any).id as string,
      numero_semana: (atual as any).numero_semana as number,
      ano: (atual as any).ano as number,
      titulo: (atual as any).titulo as string | null,
      descricao: (atual as any).descricao as string | null,
    } : null;

    const questoes: QuestaoDTO[] = Array.isArray((atual as any)?.questoes) ? ((atual as any).questoes as unknown[]).map((q: unknown) => {
      const row = q as Record<string, unknown>;
      return {
        id: String(row['id'] ?? ''),
        enunciado: String(row['enunciado'] ?? ''),
        alternativas: (row['alternativas'] as Record<string, unknown> | unknown[]) ?? [],
        resposta_correta: (row['resposta_correta'] as string | null) ?? null,
        explicacao: (row['explicacao'] as string | null) ?? null,
        disciplina: (row['disciplina'] as string | null) ?? null,
        assunto: (row['assunto'] as string | null) ?? null,
        dificuldade: (row['dificuldade'] as string | null) ?? null,
      };
    }) : [];

    return { semana, questoes };
  }

  async listarHistorico(usuarioId: string, concursoId: string, cursor?: string, limit = 10): Promise<{ items: HistoricoItemDTO[]; nextCursor: string | null; }> {
    let query = this.supabase
      .from('progresso_usuario_questoes_semanais')
      .select('id, pontuacao, total_questoes, concluido_em, questoes_semanais!inner(id, numero_semana, ano, concurso_id)')
      .eq('usuario_id', usuarioId)
      .eq('questoes_semanais.concurso_id', concursoId)
      .order('concluido_em', { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt('concluido_em', cursor);

    const { data, error } = await query;
    if (error) throw new Error((error as { message?: string } | null)?.message ?? 'Erro ao listar histórico');

    const rows = (data ?? []) as Array<any>;
    const hasMore = rows.length > limit;
    const pageItems = hasMore ? rows.slice(0, limit) : rows;
    const items: HistoricoItemDTO[] = pageItems.map((row) => ({
      id: row.id,
      numero_semana: row.questoes_semanais?.numero_semana ?? null,
      ano: row.questoes_semanais?.ano ?? null,
      concluido_em: row.concluido_em,
      pontuacao: row.pontuacao ?? 0,
      total_questoes: row.total_questoes ?? 0,
    }));
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.concluido_em ?? null : null;
    return { items, nextCursor };
  }

  async obterRoadmap(usuarioId: string, concursoId: string): Promise<RoadmapItemDTO[]> {
    const nowIso = new Date().toISOString();
    const { data: semanas, error: errSemanas } = await this.supabase
      .from('questoes_semanais')
      .select('id, numero_semana, ano, data_publicacao, data_expiracao, ativo')
      .eq('concurso_id', concursoId)
      .order('ano', { ascending: true })
      .order('numero_semana', { ascending: true });
    if (errSemanas) throw new Error((errSemanas as { message?: string } | null)?.message ?? 'Erro ao buscar semanas para roadmap');

    const { data: progresso, error: errProg } = await this.supabase
      .from('progresso_usuario_questoes_semanais')
      .select('questoes_semanais_id, concluido_em, pontuacao')
      .eq('usuario_id', usuarioId);
    if (errProg) throw new Error((errProg as { message?: string } | null)?.message ?? 'Erro ao buscar progresso para roadmap');

    const doneIds = new Set<string>((progresso ?? []).map((p: any) => p.questoes_semanais_id));
    let currentSet = false;
    return (semanas ?? []).map((s: any) => {
      if (doneIds.has(s.id)) {
        return { numero_semana: s.numero_semana, status: 'done' as const };
      }
      const isLocked = s.data_publicacao && s.data_publicacao > nowIso;
      if (!currentSet && !isLocked) {
        currentSet = true;
        return { numero_semana: s.numero_semana, status: 'current' as const };
      }
      return { numero_semana: s.numero_semana, status: isLocked ? ('locked' as const) : ('available' as const), liberaEm: isLocked ? s.data_publicacao : undefined };
    });
  }

  async obterSemanaIdPorNumero(concursoId: string, numeroSemana: number): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('questoes_semanais')
      .select('id')
      .eq('concurso_id', concursoId)
      .eq('numero_semana', numeroSemana)
      .order('ano', { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return (data as any)?.id ?? null;
  }

  async upsertConclusaoSemana(usuarioId: string, semanaId: string, payload: { respostas?: unknown[]; pontuacao?: number; tempo_minutos?: number }): Promise<{
    sucesso: boolean;
    proximaSemana?: number;
    avancou: boolean;
  }> {
    // Caso-limite: repetição de conclusão - usar upsert idempotente
    const { data: existente, error: errSelect } = await this.supabase
      .from('progresso_usuario_questoes_semanais')
      .select('id, questoes_semanais!inner(numero_semana, concurso_id)')
      .eq('usuario_id', usuarioId)
      .eq('questoes_semanais_id', semanaId)
      .single();

    let avancou = false;
    let proximaSemana: number | undefined;

    if (existente) {
      // Atualizar progresso existente (idempotência)
      const { error: errUpdate } = await this.supabase
        .from('progresso_usuario_questoes_semanais')
        .update({
          respostas: payload.respostas ?? [],
          pontuacao: payload.pontuacao ?? 0,
          concluido_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', (existente as any).id);
      
      if (errUpdate) {
        throw new Error(`Erro ao atualizar progresso da semana: ${(errUpdate as { message?: string } | null)?.message ?? 'Erro desconhecido'}`);
      }
    } else {
      // Inserir novo progresso
      const { error: errInsert } = await this.supabase
        .from('progresso_usuario_questoes_semanais')
        .insert({
          usuario_id: usuarioId,
          questoes_semanais_id: semanaId,
          pontuacao: payload.pontuacao ?? 0,
          respostas: payload.respostas ?? [],
          concluido_em: new Date().toISOString(),
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        });
      
      if (errInsert) {
        throw new Error(`Erro ao registrar conclusão da semana: ${(errInsert as { message?: string } | null)?.message ?? 'Erro desconhecido'}`);
      }
    }

    // Caso-limite: corrida de avanço automático - verificar se deve avançar
    try {
      const numeroSemanaAtual = (existente as any)?.questoes_semanais?.numero_semana;
      if (numeroSemanaAtual) {
        const concursoId = (existente as any)?.questoes_semanais?.concurso_id;
        
        // Verificar se pode avançar baseado na política
        const podeAvançar = await this.statusService.podeAvançar(usuarioId, concursoId);
        
        if (podeAvançar) {
          // Usar transação para evitar corrida
          if (await this.statusService.avancarSemanaStrict(usuarioId, concursoId)) {
            avancou = true;
            proximaSemana = numeroSemanaAtual + 1;
          }
        }
      }
    } catch (error) {
      // Log do erro mas não falhar a conclusão
      console.error('Erro ao processar avanço automático:', error);
    }

    return {
      sucesso: true,
      proximaSemana,
      avancou,
    };
  }
}


