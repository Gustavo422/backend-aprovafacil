import type { SupabaseClient } from '@supabase/supabase-js';

export interface IAlunoDashboardRepository {
  fetchSimulados(usuarioId: string): Promise<Array<{
    id: string;
    concluido_em: string | null;
    tempo_gasto_minutos: number | null;
    pontuacao: number | null;
  }>>;

  fetchQuestoesSemanais(usuarioId: string): Promise<Array<{
    id: string;
    correta: boolean | null;
    criado_em: string;
  }>>;

  fetchFlashcards(usuarioId: string): Promise<Array<{
    id: string;
    status: string;
    atualizado_em: string;
  }>>;

  fetchSimuladoActivities(usuarioId: string): Promise<Array<{
    id: string;
    concluido_em: string;
    tempo_gasto_minutos: number | null;
    pontuacao: number;
    simulados: { titulo: string | null; dificuldade: string | null } | null;
  }>>;

  fetchFlashcardActivities(usuarioId: string): Promise<Array<{
    id: string;
    criado_em: string;
    status: string;
    atualizado_em: string;
    cartoes_memorizacao: { frente: string | null; disciplina: string | null } | null;
  }>>;

  fetchApostilaActivities(usuarioId: string): Promise<Array<{
    id: string;
    criado_em: string;
    atualizado_em: string;
    percentual_progresso: number | null;
    conteudo_apostila: { titulo: string | null } | null;
  }>>;
}

export class AlunoDashboardRepository implements IAlunoDashboardRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async fetchSimulados(usuarioId: string) {
    const { data } = await this.supabase
      .from('progresso_usuario_simulado')
      .select('id, usuario_id, pontuacao, tempo_gasto_minutos, respostas, concluido_em')
      .eq('usuario_id', usuarioId);
    // Tolerância a colunas novas: mapear explicitamente apenas os campos necessários
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row?.id ?? ''),
      concluido_em: row?.concluido_em ? String(row.concluido_em) : null,
      tempo_gasto_minutos: (row?.tempo_gasto_minutos === null || row?.tempo_gasto_minutos === undefined) ? null : Number(row.tempo_gasto_minutos),
      pontuacao: (row?.pontuacao === null || row?.pontuacao === undefined) ? null : Number(row.pontuacao),
    }));
    return normalized as Array<{
      id: string;
      concluido_em: string | null;
      tempo_gasto_minutos: number | null;
      pontuacao: number | null;
    }>;
  }

  async fetchQuestoesSemanais(usuarioId: string) {
    const { data } = await this.supabase
      .from('respostas_questoes_semanais')
      .select('id, usuario_id, correta, criado_em')
      .eq('usuario_id', usuarioId);
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row?.id ?? ''),
      correta: typeof row?.correta === 'boolean' ? row.correta : null,
      criado_em: String(row?.criado_em ?? new Date().toISOString()),
    }));
    return normalized as Array<{ id: string; correta: boolean | null; criado_em: string }>;
  }

  async fetchFlashcards(usuarioId: string) {
    const { data } = await this.supabase
      .from('progresso_usuario_flashcard')
      .select('id, usuario_id, status, atualizado_em')
      .eq('usuario_id', usuarioId);
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row?.id ?? ''),
      status: String(row?.status ?? ''),
      atualizado_em: String(row?.atualizado_em ?? new Date().toISOString()),
    }));
    return normalized as Array<{ id: string; status: string; atualizado_em: string }>;
  }

  async fetchSimuladoActivities(usuarioId: string) {
    const { data } = await this.supabase
      .from('v_guru_simulado_activities')
      .select('id, usuario_id, concluido_em, tempo_gasto_minutos, pontuacao, titulo, dificuldade')
      .eq('usuario_id', usuarioId)
      .order('concluido_em', { ascending: false })
      .limit(10);
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row.id),
      concluido_em: String(row.concluido_em),
      tempo_gasto_minutos: (row.tempo_gasto_minutos === null || row.tempo_gasto_minutos === undefined) ? null : Number(row.tempo_gasto_minutos),
      pontuacao: Number(row.pontuacao ?? 0),
      simulados: { titulo: row?.titulo ?? null, dificuldade: row?.dificuldade ?? null },
    }));
    return normalized as Array<{
      id: string;
      concluido_em: string;
      tempo_gasto_minutos: number | null;
      pontuacao: number;
      simulados: { titulo: string | null; dificuldade: string | null } | null;
    }>;
  }

  async fetchFlashcardActivities(usuarioId: string) {
    const { data } = await this.supabase
      .from('v_guru_flashcard_activities')
      .select('id, usuario_id, criado_em, status, atualizado_em, frente, disciplina')
      .eq('usuario_id', usuarioId)
      .order('atualizado_em', { ascending: false })
      .limit(10);
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row.id),
      criado_em: String(row.criado_em),
      status: String(row.status),
      atualizado_em: String(row.atualizado_em),
      cartoes_memorizacao: { frente: row?.frente ?? null, disciplina: row?.disciplina ?? null },
    }));
    return normalized as Array<{
      id: string;
      criado_em: string;
      status: string;
      atualizado_em: string;
      cartoes_memorizacao: { frente: string | null; disciplina: string | null } | null;
    }>;
  }

  async fetchApostilaActivities(usuarioId: string) {
    const { data } = await this.supabase
      .from('v_guru_apostila_activities')
      .select('id, usuario_id, criado_em, atualizado_em, percentual_progresso, titulo')
      .eq('usuario_id', usuarioId)
      .order('atualizado_em', { ascending: false })
      .limit(5);
    const normalized = (data ?? []).map((row: any) => ({
      id: String(row.id),
      criado_em: String(row.criado_em),
      atualizado_em: String(row.atualizado_em),
      percentual_progresso: (row.percentual_progresso === null || row.percentual_progresso === undefined) ? null : Number(row.percentual_progresso),
      conteudo_apostila: { titulo: row?.titulo ?? null },
    }));
    return normalized as Array<{
      id: string;
      criado_em: string;
      atualizado_em: string;
      percentual_progresso: number | null;
      conteudo_apostila: { titulo: string | null } | null;
    }>;
  }
}