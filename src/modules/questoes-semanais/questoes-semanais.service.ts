import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICacheService, ILogService } from '../../core/interfaces/index.js';
import type { AtualResponseDTO, HistoricoResponseDTO, RoadmapItemDTO } from './dtos/questoes-semanais.dto.js';
import type { IQuestoesSemanaisRepository } from './questoes-semanais.repository.js';
import { QuestoesSemanaisStatusService } from './questoes-semanais-status.service.js';
import { getConfig } from './questoes-semanais.config.js';
import { 
  ErrorFactory, 
  WeekNotFoundError, 
  InvalidStateError,
  DatabaseError 
} from './errors/questoes-semanais.errors.js';

export class QuestoesSemanaisService {
  private readonly supabase: SupabaseClient;
  private readonly repo: IQuestoesSemanaisRepository;
  private readonly cache: ICacheService;
  private readonly log: ILogService;
  private readonly statusService: QuestoesSemanaisStatusService;
  private readonly config = getConfig();

  constructor(supabase: SupabaseClient, repo: IQuestoesSemanaisRepository, cache: ICacheService, log: ILogService) {
    this.supabase = supabase;
    this.repo = repo;
    this.cache = cache;
    this.log = log;
    this.statusService = new QuestoesSemanaisStatusService(supabase);
  }

  async obterSemanaAtual(concursoId: string, usuarioId?: string): Promise<AtualResponseDTO> {
    const cacheKey = `qs:atual:${concursoId}:${usuarioId ?? 'anon'}`;
    const cached = await this.cache.obter<AtualResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      this.log.info('Buscando semana atual', { concursoId, usuarioId });
      
      const { semana, questoes } = await this.repo.buscarSemanaAtual(concursoId);
      this.log.info('Semana e questões obtidas', { 
        semanaId: semana?.id, 
        questoesCount: questoes?.length 
      });

      let historico: AtualResponseDTO['historico'] = [];
      if (usuarioId) {
        const hist = await this.repo.listarHistorico(usuarioId, concursoId, undefined, 10);
        historico = hist.items;
        this.log.info('Histórico obtido', { historicoCount: historico.length });
      }

      // Obter status da semana atual (incluindo tempo restante)
      this.log.info('Obtendo status da semana atual', { usuarioId: usuarioId || 'anonymous', concursoId });
      const statusInfo = await this.statusService.obterSemanaAtual(usuarioId || 'anonymous', concursoId);
      this.log.info('Status obtido', { 
        numeroSemana: statusInfo.numeroSemana,
        podeAvançar: statusInfo.podeAvançar,
        tempoRestante: statusInfo.tempoRestante
      });

      const data: AtualResponseDTO = {
        questao_semanal: semana,
        questoes,
        historico,
        status: {
          semana_atual: statusInfo.numeroSemana,
          inicio_semana_em: statusInfo.inicioSemana.toISOString(),
          fim_semana_em: statusInfo.fimSemana.toISOString(),
          modo_desbloqueio: statusInfo.podeAvançar ? 'accelerated' : 'strict',
          tempo_restante: statusInfo.tempoRestante ? Math.floor(statusInfo.tempoRestante / 1000) : undefined, // Converter para segundos
        },
      };
      
      this.log.info('Dados da semana atual construídos', { 
        hasStatus: !!data.status,
        statusFields: Object.keys(data.status || {})
      });
      
      await this.cache.definir(cacheKey, data, 30);
      return data;
    } catch (error) {
      this.log.erro('Erro ao obter semana atual', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      if (error instanceof Error) {
        throw error;
      }
      throw new DatabaseError('Erro ao buscar semana atual', error);
    }
  }

  async listarHistorico(usuarioId: string, concursoId: string, cursor?: string, limit?: number): Promise<HistoricoResponseDTO> {
    try {
      const res = await this.repo.listarHistorico(usuarioId, concursoId, cursor, limit ?? 10);
      return { items: res.items, nextCursor: res.nextCursor, limit: limit ?? 10 };
    } catch (error) {
      this.log.erro('Erro ao listar histórico', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      if (error instanceof Error) {
        throw error;
      }
      throw new DatabaseError('Erro ao listar histórico', error);
    }
  }

  async obterRoadmap(usuarioId: string, concursoId: string): Promise<RoadmapItemDTO[]> {
    try {
      return await this.repo.obterRoadmap(usuarioId, concursoId);
    } catch (error) {
      this.log.erro('Erro ao obter roadmap', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      if (error instanceof Error) {
        throw error;
      }
      throw new DatabaseError('Erro ao obter roadmap', error);
    }
  }

  async concluirSemana(
    usuarioId: string, 
    concursoId: string, 
    numeroSemana: number, 
    payload: { 
      respostas?: unknown[]; 
      pontuacao?: number; 
      tempo_minutos?: number;
      observacoes?: string;
    }
  ): Promise<{
    sucesso: boolean;
    proximaSemana?: number;
    avancou: boolean;
    modoDesbloqueio: 'strict' | 'accelerated';
  }> {
    try {
      // Caso-limite: validar se a semana existe
      const semanaId = await this.repo.obterSemanaIdPorNumero(concursoId, numeroSemana);
      if (!semanaId) {
        throw ErrorFactory.weekNotFound(numeroSemana, concursoId);
      }

      // Caso-limite: validar se o usuário pode concluir esta semana
      const status = await this.statusService.obterOuCriarStatus(usuarioId, concursoId);
      if (status.semana_atual !== numeroSemana) {
        throw new InvalidStateError(
          `Só é possível concluir a semana atual (${status.semana_atual}), não a semana ${numeroSemana}`,
          { semanaAtual: status.semana_atual, semanaSolicitada: numeroSemana }
        );
      }

      // Registrar conclusão com upsert idempotente
      const resultado = await this.repo.upsertConclusaoSemana(usuarioId, semanaId, payload);

      // Caso-limite: corrida de avanço automático - processar avanço se necessário
      if (this.config.unlockPolicy === 'accelerated' && resultado.sucesso) {
        try {
          await this.statusService.avancarSemanaAccelerated(usuarioId, concursoId, numeroSemana);
          resultado.avancou = true;
          resultado.proximaSemana = numeroSemana + 1;
        } catch (error) {
          // Log do erro mas não falhar a conclusão
          this.log.erro('Erro ao avançar semana accelerated', error instanceof Error ? error : new Error('Erro desconhecido'));
        }
      }

      // Limpar cache relacionado
      await this.cache.limparPorPrefixo(`qs:`);

      return {
        ...resultado,
        modoDesbloqueio: this.config.unlockPolicy,
      };
    } catch (error) {
      this.log.erro('Erro ao concluir semana', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      // Re-throw erros conhecidos
      if (error instanceof WeekNotFoundError || error instanceof InvalidStateError) {
        throw error;
      }
      
      // Wrap erros desconhecidos
      if (error instanceof Error) {
        throw new DatabaseError(`Erro ao concluir semana: ${error.message}`, error);
      }
      
      throw new DatabaseError('Erro desconhecido ao concluir semana', error);
    }
  }

  /**
   * Processa avanços automáticos em lote (para cron/edge function)
   */
  async processarAvancosAutomaticos(): Promise<{
    processados: number;
    avancados: number;
    erros: number;
  }> {
    try {
      return await this.statusService.processarAvancosAutomaticos();
    } catch (error) {
      this.log.erro('Erro ao processar avanços automáticos', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      if (error instanceof Error) {
        throw error;
      }
      throw new DatabaseError('Erro ao processar avanços automáticos', error);
    }
  }

  /**
   * Obtém informações da semana atual do usuário
   */
  async obterSemanaAtualUsuario(usuarioId: string, concursoId: string): Promise<{
    numeroSemana: number;
    inicioSemana: Date;
    fimSemana: Date;
    podeAvançar: boolean;
    tempoRestante?: number;
    modoDesbloqueio: 'strict' | 'accelerated';
  }> {
    try {
      const info = await this.statusService.obterSemanaAtual(usuarioId, concursoId);
      return {
        ...info,
        modoDesbloqueio: this.config.unlockPolicy,
      };
    } catch (error) {
      this.log.erro('Erro ao obter semana atual do usuário', error instanceof Error ? error : new Error('Erro desconhecido'));
      
      if (error instanceof Error) {
        throw error;
      }
      throw new DatabaseError('Erro ao obter semana atual do usuário', error);
    }
  }
}