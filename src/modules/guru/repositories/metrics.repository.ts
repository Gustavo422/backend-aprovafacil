import type { SupabaseClient } from '@supabase/supabase-js';

export interface PreferredConcursoInfo {
  nivel_dificuldade: string;
  multiplicador_questoes: number;
}

export interface IGuruMetricsRepository {
  getPreferredConcursoInfo(usuarioId: string): Promise<PreferredConcursoInfo | null>;
  fetchSimuladoRespostas(usuarioId: string): Promise<Array<{ respostas: Record<string, unknown> | null }>>;
  fetchQuestoesSemanaisIds(usuarioId: string): Promise<Array<{ id: string; criado_em: string }>>;
  fetchFlashcardsStatus(usuarioId: string): Promise<Array<{ status: string }>>;
  fetchApostilasProgresso(usuarioId: string): Promise<Array<{ percentual_progresso: number | null; concluido?: boolean }>>;
  fetchSimuladosConcluidoEmDesde(usuarioId: string, isoDate: string): Promise<Array<{ concluido_em: string | null }>>;
  fetchQuestoesSemanaisCriadoEmDesde(usuarioId: string, isoDate: string): Promise<Array<{ criado_em: string }>>;
}

export class GuruMetricsRepository implements IGuruMetricsRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async getPreferredConcursoInfo(usuarioId: string): Promise<PreferredConcursoInfo | null> {
    const { data, error } = await this.supabase
      .from('preferencias_usuario_concurso')
      .select(`
        concurso_id,
        concursos (
          id,
          nome,
          nivel_dificuldade,
          multiplicador_questoes
        )
      `)
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)
      .single();

    if (error || !data || typeof data.concursos !== 'object' || data.concursos === null) {
      return null;
    }

    const concurso = Array.isArray(data.concursos) ? data.concursos[0] : data.concursos;
    if (!concurso) return null;

    return {
      nivel_dificuldade: String(concurso.nivel_dificuldade),
      multiplicador_questoes: Number(concurso.multiplicador_questoes),
    };
  }

  async fetchSimuladoRespostas(usuarioId: string): Promise<Array<{ respostas: Record<string, unknown> | null }>> {
    const { data } = await this.supabase
      .from('progresso_usuario_simulado')
      .select('respostas')
      .eq('usuario_id', usuarioId);
    return (data ?? []) as Array<{ respostas: Record<string, unknown> | null }>;
  }

  async fetchQuestoesSemanaisIds(usuarioId: string): Promise<Array<{ id: string; criado_em: string }>> {
    const { data } = await this.supabase
      .from('respostas_questoes_semanais')
      .select('id, criado_em')
      .eq('usuario_id', usuarioId);
    return (data ?? []) as Array<{ id: string; criado_em: string }>;
  }

  async fetchFlashcardsStatus(usuarioId: string): Promise<Array<{ status: string }>> {
    const { data } = await this.supabase
      .from('progresso_usuario_flashcard')
      .select('status')
      .eq('usuario_id', usuarioId);
    return (data ?? []) as Array<{ status: string }>;
  }

  async fetchApostilasProgresso(usuarioId: string): Promise<Array<{ percentual_progresso: number | null; concluido?: boolean }>> {
    const { data } = await this.supabase
      .from('progresso_usuario_apostila')
      .select('percentual_progresso, concluido')
      .eq('usuario_id', usuarioId);
    return (data ?? []) as Array<{ percentual_progresso: number | null; concluido?: boolean }>;
  }

  async fetchSimuladosConcluidoEmDesde(usuarioId: string, isoDate: string): Promise<Array<{ concluido_em: string | null }>> {
    const { data } = await this.supabase
      .from('progresso_usuario_simulado')
      .select('concluido_em')
      .eq('usuario_id', usuarioId)
      .gte('concluido_em', isoDate);
    return (data ?? []) as Array<{ concluido_em: string | null }>;
  }

  async fetchQuestoesSemanaisCriadoEmDesde(usuarioId: string, isoDate: string): Promise<Array<{ criado_em: string }>> {
    const { data } = await this.supabase
      .from('respostas_questoes_semanais')
      .select('criado_em')
      .eq('usuario_id', usuarioId)
      .gte('criado_em', isoDate);
    return (data ?? []) as Array<{ criado_em: string }>;
  }
}


