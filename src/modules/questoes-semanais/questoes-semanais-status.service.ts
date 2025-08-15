import type { SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './questoes-semanais.config.js';

/**
 * Status do usuário em questões semanais
 */
export interface UsuarioQuestoesSemanaisStatus {
  id: string;
  usuario_id: string;
  concurso_id: string;
  semana_atual: number;
  inicio_semana_em: string;
  fim_semana_em: string;
  modo_desbloqueio: 'strict' | 'accelerated';
  criado_em: string;
  atualizado_em: string;
}

/**
 * Serviço para gerenciar o status do usuário em questões semanais
 */
export class QuestoesSemanaisStatusService {
  private readonly supabase: SupabaseClient;
  private readonly config = getConfig();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Obtém ou cria o status do usuário para um concurso
   */
  async obterOuCriarStatus(usuarioId: string, concursoId: string): Promise<UsuarioQuestoesSemanaisStatus> {
    console.log('🔍 [StatusService] Obtendo ou criando status', { usuarioId, concursoId });
    
    // Tentar obter status existente
    const { data: existente, error: errSelect } = await this.supabase
      .from('usuario_questoes_semanais_status')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('concurso_id', concursoId)
      .single();

    if (existente) {
      console.log('✅ [StatusService] Status existente encontrado', { 
        id: existente.id, 
        semana_atual: existente.semana_atual,
        modo_desbloqueio: existente.modo_desbloqueio
      });
      return existente as UsuarioQuestoesSemanaisStatus;
    }

    console.log('🆕 [StatusService] Criando novo status', { 
      usuarioId, 
      concursoId, 
      config: this.config 
    });

    // Criar novo status se não existir
    const agora = new Date();
    const inicioSemana = new Date(agora.getTime());
    const fimSemana = new Date(agora.getTime() + (this.config.weekDurationDays * 24 * 60 * 60 * 1000));

    const { data: novo, error: errInsert } = await this.supabase
      .from('usuario_questoes_semanais_status')
      .insert({
        usuario_id: usuarioId,
        concurso_id: concursoId,
        semana_atual: 1,
        inicio_semana_em: inicioSemana.toISOString(),
        fim_semana_em: fimSemana.toISOString(),
        modo_desbloqueio: this.config.unlockPolicy,
        criado_em: agora.toISOString(),
        atualizado_em: agora.toISOString(),
      })
      .select()
      .single();

    if (errInsert || !novo) {
      console.error('❌ [StatusService] Erro ao criar status', { 
        error: errInsert, 
        config: this.config 
      });
      throw new Error(`Erro ao criar status do usuário: ${(errInsert as any)?.message ?? 'Erro desconhecido'}`);
    }

    console.log('✅ [StatusService] Novo status criado', { 
      id: novo.id, 
      semana_atual: novo.semana_atual,
      modo_desbloqueio: novo.modo_desbloqueio
    });

    return novo as UsuarioQuestoesSemanaisStatus;
  }

  /**
   * Avança o usuário para a próxima semana (modo strict)
   * Usa transação para evitar corrida de avanço automático
   */
  async avancarSemanaStrict(usuarioId: string, concursoId: string): Promise<boolean> {
    const agora = new Date();
    
    // Usar transação para evitar corrida
    const { data, error } = await this.supabase.rpc('avancar_semana_strict', {
      p_usuario_id: usuarioId,
      p_concurso_id: concursoId,
      p_agora: agora.toISOString(),
      p_duracao_dias: this.config.weekDurationDays,
    });

    if (error) {
      throw new Error(`Erro ao avançar semana: ${error.message}`);
    }

    return data === true;
  }

  /**
   * Avança o usuário para a próxima semana (modo accelerated)
   * Chamado imediatamente após conclusão
   */
  async avancarSemanaAccelerated(usuarioId: string, concursoId: string, numeroSemanaAtual: number): Promise<void> {
    const agora = new Date();
    const inicioProximaSemana = new Date(agora.getTime());
    const fimProximaSemana = new Date(agora.getTime() + (this.config.weekDurationDays * 24 * 60 * 60 * 1000));

    const { error } = await this.supabase
      .from('usuario_questoes_semanais_status')
      .update({
        semana_atual: numeroSemanaAtual + 1,
        inicio_semana_em: inicioProximaSemana.toISOString(),
        fim_semana_em: fimProximaSemana.toISOString(),
        atualizado_em: agora.toISOString(),
      })
      .eq('usuario_id', usuarioId)
      .eq('concurso_id', concursoId);

    if (error) {
      throw new Error(`Erro ao avançar semana accelerated: ${error.message}`);
    }
  }

  /**
   * Verifica se o usuário pode avançar para a próxima semana
   */
  async podeAvançar(usuarioId: string, concursoId: string): Promise<boolean> {
    const status = await this.obterOuCriarStatus(usuarioId, concursoId);
    
    if (status.modo_desbloqueio === 'accelerated') {
      return true; // Sempre pode avançar no modo accelerated
    }

    // No modo strict, verificar se o prazo expirou
    const agora = new Date();
    const fimSemana = new Date(status.fim_semana_em);
    return agora >= fimSemana;
  }

  /**
   * Obtém informações da semana atual do usuário
   */
  async obterSemanaAtual(usuarioId: string, concursoId: string): Promise<{
    numeroSemana: number;
    inicioSemana: Date;
    fimSemana: Date;
    podeAvançar: boolean;
    tempoRestante?: number; // em milissegundos
  }> {
    console.log('🔍 [StatusService] Obtendo semana atual', { usuarioId, concursoId });
    
    const status = await this.obterOuCriarStatus(usuarioId, concursoId);
    console.log('✅ [StatusService] Status obtido', { 
      semana_atual: status.semana_atual,
      modo_desbloqueio: status.modo_desbloqueio,
      inicio_semana: status.inicio_semana_em,
      fim_semana: status.fim_semana_em
    });
    
    const agora = new Date();
    const fimSemana = new Date(status.fim_semana_em);
    
    const podeAvançar = status.modo_desbloqueio === 'accelerated' || agora >= fimSemana;
    const tempoRestante = status.modo_desbloqueio === 'strict' && agora < fimSemana 
      ? fimSemana.getTime() - agora.getTime() 
      : undefined;

    const result = {
      numeroSemana: status.semana_atual,
      inicioSemana: new Date(status.inicio_semana_em),
      fimSemana: fimSemana,
      podeAvançar,
      tempoRestante,
    };

    console.log('✅ [StatusService] Resultado final', { 
      numeroSemana: result.numeroSemana,
      podeAvançar: result.podeAvançar,
      tempoRestante: result.tempoRestante,
      tempoRestanteSegundos: result.tempoRestante ? Math.floor(result.tempoRestante / 1000) : undefined
    });

    return result;
  }

  /**
   * Processa avanço automático em lote (para cron/edge function)
   */
  async processarAvancosAutomaticos(): Promise<{
    processados: number;
    avancados: number;
    erros: number;
  }> {
    if (this.config.unlockPolicy !== 'strict') {
      return { processados: 0, avancados: 0, erros: 0 };
    }

    const agora = new Date();
    let processados = 0;
    let avancados = 0;
    let erros = 0;

    // Buscar usuários que podem avançar
    const { data: usuariosParaAvancar, error: errSelect } = await this.supabase
      .from('usuario_questoes_semanais_status')
      .select('usuario_id, concurso_id, semana_atual')
      .eq('modo_desbloqueio', 'strict')
      .lte('fim_semana_em', agora.toISOString())
      .limit(this.config.maxConcurrentAdvances);

    if (errSelect) {
      throw new Error(`Erro ao buscar usuários para avanço: ${errSelect.message}`);
    }

    // Processar avanços em paralelo (limitado)
    const promises = (usuariosParaAvancar ?? []).map(async (usuario) => {
      processados++;
      try {
        const sucesso = await this.avancarSemanaStrict(usuario.usuario_id, usuario.concurso_id);
        if (sucesso) avancados++;
      } catch (error) {
        erros++;
        console.error(`Erro ao avançar usuário ${usuario.usuario_id}:`, error);
      }
    });

    await Promise.all(promises);

    return { processados, avancados, erros };
  }
}
