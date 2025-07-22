import { BaseService, BaseServiceOptions } from '../../core/services/base-service.js';
import { IApostilaService, IApostilaRepository } from '../../core/interfaces/index.js';
import { Apostila, ConteudoApostila, ApiResponse } from '../../shared/types/index.js';
// import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { ValidationError, NotFoundError } from '../../core/errors/index.js';
import { FiltroApostila } from './apostila.repository.js';
import { performance } from 'perf_hooks';

/**
 * Dados para criação de apostila
 */
export interface CriarApostilaData {
  titulo: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: string[];
}

/**
 * Dados para atualização de apostila
 */
export interface AtualizarApostilaData {
  titulo?: string;
  descricao?: string;
  concurso_id?: string;
  categoria_id?: string;
  disciplinas?: string[];
  ativo?: boolean;
}

/**
 * Dados para progresso de apostila
 */
export interface MarcarProgressoData {
  usuarioId: string;
  conteudoId: string;
  percentual: number;
}

/**
 * Serviço de apostilas
 */
export class ApostilaService extends BaseService<Apostila, FiltroApostila> implements IApostilaService {
  /**
   * Construtor
   * @param apostilaRepository Repositório de apostilas
   * @param options Opções do serviço
   */
  constructor(
    apostilaRepository: IApostilaRepository,
    options?: Partial<BaseServiceOptions>
  ) {
    super(apostilaRepository, {
      serviceName: 'Apostila',
      enableCache: true,
      cacheTime: 600, // 10 minutos
      ...options
    });
    
    this.logger.info('Serviço de apostilas inicializado');
  }
  
  /**
   * Buscar apostila por slug
   * @param slug Slug da apostila
   * @returns Resposta com a apostila
   */
  async buscarPorSlug(slug: string): Promise<ApiResponse<Apostila>> {
    const startTime = performance.now();
    const operationId = `apostila-buscarPorSlug-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando apostila por slug', { operationId, slug });
      
      // Validar entrada
      if (!slug) {
        throw new ValidationError('Slug é obrigatório');
      }
      
      if (slug.length < 2) {
        throw new ValidationError('Slug deve ter pelo menos 2 caracteres');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarPorSlug:${slug}`);
        if (cached && !('items' in cached)) {
          this.logger.debug('Cache hit para buscarPorSlug', { operationId });
          return {
            success: true,
            data: cached as Apostila
          };
        }
      }
      
      // Buscar no repositório
      const apostila = await (this.repository as IApostilaRepository).buscarPorSlug(slug);
      
      if (!apostila) {
        const executionTime = performance.now() - startTime;
        this.logger.warn('Apostila não encontrada por slug', {
          operationId,
          slug,
          executionTimeMs: executionTime.toFixed(2)
        });
        
        return {
          success: false,
          message: 'Apostila não encontrada',
          error: 'NOT_FOUND'
        };
      }
      
      // Processar dados após busca
      const processedApostila = await this.processAfterFind(apostila);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorSlug:${slug}`, processedApostila);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Apostila encontrada por slug', {
        operationId,
        apostilaId: apostila.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedApostila
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `buscarPorSlug:${slug}`, operationId, executionTime);
    }
  }
  
  /**
   * Buscar apostilas por concurso
   * @param concursoId ID do concurso
   * @returns Resposta com as apostilas
   */
  async buscarPorConcurso(concursoId: string): Promise<ApiResponse<Apostila[]>> {
    const startTime = performance.now();
    const operationId = `apostila-buscarPorConcurso-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando apostilas por concurso', { operationId, concursoId });
      
      // Validar entrada
      if (!concursoId) {
        throw new ValidationError('ID do concurso é obrigatório');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarPorConcurso:${concursoId}`);
        if (Array.isArray(cached)) {
          this.logger.debug('Cache hit para buscarPorConcurso', { operationId });
          return {
            success: true,
            data: cached as Apostila[]
          };
        }
      }
      
      // Buscar no repositório
      const apostilas = await (this.repository as IApostilaRepository).buscarPorConcurso(concursoId);
      
      // Processar dados após busca
      const processedApostilas = await Promise.all(
        apostilas.map(apostila => this.processAfterFind(apostila))
      );
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorConcurso:${concursoId}`, processedApostilas);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Apostilas encontradas por concurso', {
        operationId,
        concursoId,
        count: processedApostilas.length,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedApostilas
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, `buscarPorConcurso:${concursoId}`, operationId, executionTime);
      if (result && Array.isArray(result.data)) {
        return result as unknown as ApiResponse<Apostila[]>;
      }
      return { ...(result as unknown as ApiResponse<Apostila[]>), data: [] };
    }
  }
  
  /**
   * Buscar apostila com conteúdo
   * @param id ID da apostila
   * @returns Resposta com a apostila e conteúdo
   */
  async buscarComConteudo(id: string): Promise<ApiResponse<Apostila & { conteudo: ConteudoApostila[] }>> {
    const startTime = performance.now();
    const operationId = `apostila-buscarComConteudo-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando apostila com conteúdo', { operationId, apostilaId: id });
      
      // Validar entrada
      if (!id) {
        throw new ValidationError('ID da apostila é obrigatório');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarComConteudo:${id}`);
        if (cached && 'conteudo' in cached) {
          this.logger.debug('Cache hit para buscarComConteudo', { operationId });
          return {
            success: true,
            data: cached as Apostila & { conteudo: ConteudoApostila[] }
          };
        }
      }
      
      // Buscar no repositório
      const apostilaComConteudo = await (this.repository as IApostilaRepository).buscarComConteudo(id);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarComConteudo:${id}`, apostilaComConteudo);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Apostila com conteúdo encontrada', {
        operationId,
        apostilaId: id,
        modulosCount: apostilaComConteudo.conteudo.length,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: apostilaComConteudo
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, `buscarComConteudo:${id}`, operationId, executionTime);
      if (result && result.data && 'conteudo' in result.data) {
        return result as ApiResponse<Apostila & { conteudo: ConteudoApostila[] }>;
      }
      return { ...result, data: { conteudo: [] } } as ApiResponse<Apostila & { conteudo: ConteudoApostila[] }>;
    }
  }
  
  /**
   * Marcar progresso na apostila
   * @param usuarioId ID do usuário
   * @param conteudoId ID do conteúdo
   * @param percentual Percentual de progresso
   * @returns Resposta da operação
   */
  async marcarProgresso(usuarioId: string, conteudoId: string, percentual: number): Promise<ApiResponse<boolean>> {
    const startTime = performance.now();
    const operationId = `apostila-marcarProgresso-${Date.now()}`;
    
    try {
      this.logger.debug('Marcando progresso na apostila', {
        operationId,
        usuarioId,
        conteudoId,
        percentual
      });
      
      // Validar entrada
      await this.validateMarcarProgressoInput({ usuarioId, conteudoId, percentual });
      
      // Aqui você implementaria a lógica para salvar o progresso
      // Por exemplo, inserir/atualizar na tabela progresso_usuario_apostila
      
      // Por enquanto, vamos simular o sucesso
      const executionTime = performance.now() - startTime;
      this.logger.info('Progresso marcado com sucesso', {
        operationId,
        usuarioId,
        conteudoId,
        percentual,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: true,
        message: 'Progresso marcado com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, `marcarProgresso:${usuarioId}:${conteudoId}`, operationId, executionTime);
      if (result && typeof result.data === 'boolean') {
        return result as unknown as ApiResponse<boolean>;
      }
      return { ...(result as unknown as ApiResponse<boolean>), data: false };
    }
  }
  
  /**
   * Criar apostila
   * @param dados Dados da apostila
   * @returns Resposta com a apostila criada
   */
  async criarApostila(dados: CriarApostilaData): Promise<ApiResponse<Apostila>> {
    const startTime = performance.now();
    const operationId = `apostila-criarApostila-${Date.now()}`;
    
    try {
      this.logger.debug('Criando nova apostila', { 
        operationId,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateCreateApostilaInput(dados);
      
      // Verificar se já existe apostila com o mesmo título
      const slug = this.gerarSlug(dados.titulo);
      const apostilaExistente = await (this.repository as IApostilaRepository).buscarPorSlug(slug);
      
      if (apostilaExistente) {
        return {
          success: false,
          error: 'APOSTILA_ALREADY_EXISTS',
          message: 'Já existe uma apostila com este título'
        };
      }
      
      // Preparar dados da apostila
      const dadosApostila: Partial<Apostila> = {
        titulo: dados.titulo.trim(),
        slug,
        descricao: dados.descricao?.trim(),
        concurso_id: dados.concurso_id,
        categoria_id: dados.categoria_id,
        disciplinas: dados.disciplinas || [],
        ativo: true
      };
      
      // Criar apostila
      const apostila = await this.repository.criar(dadosApostila);
      
      // Processar dados após criação
      const processedApostila = await this.processAfterCreate(apostila);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('criar');
        if (dados.concurso_id) {
          this.clearRelatedCache(`buscarPorConcurso:${dados.concurso_id}`);
        }
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Apostila criada com sucesso', {
        operationId,
        apostilaId: apostila.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedApostila,
        message: 'Apostila criada com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, 'criarApostila', operationId, executionTime);
    }
  }
  
  /**
   * Atualizar apostila
   * @param id ID da apostila
   * @param dados Dados para atualização
   * @returns Resposta com a apostila atualizada
   */
  async atualizarApostila(id: string, dados: AtualizarApostilaData): Promise<ApiResponse<Apostila>> {
    const startTime = performance.now();
    const operationId = `apostila-atualizarApostila-${Date.now()}`;
    
    try {
      this.logger.debug('Atualizando apostila', { 
        operationId,
        apostilaId: id,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateUpdateApostilaInput(dados);
      
      // Verificar se apostila existe
      const apostilaExistente = await this.repository.buscarPorId(id);
      
      if (!apostilaExistente) {
        throw new NotFoundError('Apostila não encontrada');
      }
      
      // Se título está sendo alterado, verificar se já existe outra apostila com o mesmo título
      if (dados.titulo && dados.titulo !== apostilaExistente.titulo) {
        const slug = this.gerarSlug(dados.titulo);
        const apostilaComMesmoTitulo = await (this.repository as IApostilaRepository).buscarPorSlug(slug);
        
        if (apostilaComMesmoTitulo && apostilaComMesmoTitulo.id !== id) {
          return {
            success: false,
            error: 'APOSTILA_ALREADY_EXISTS',
            message: 'Já existe uma apostila com este título'
          };
        }
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao: Partial<Apostila> = {};
      
      if (dados.titulo) {
        dadosAtualizacao.titulo = dados.titulo.trim();
        dadosAtualizacao.slug = this.gerarSlug(dados.titulo);
      }
      
      if (dados.descricao !== undefined) {
        dadosAtualizacao.descricao = dados.descricao?.trim();
      }
      
      if (dados.concurso_id !== undefined) {
        dadosAtualizacao.concurso_id = dados.concurso_id;
      }
      
      if (dados.categoria_id !== undefined) {
        dadosAtualizacao.categoria_id = dados.categoria_id;
      }
      
      if (dados.disciplinas !== undefined) {
        dadosAtualizacao.disciplinas = dados.disciplinas;
      }
      
      if (dados.ativo !== undefined) {
        dadosAtualizacao.ativo = dados.ativo;
      }
      
      // Atualizar apostila
      const apostilaAtualizada = await this.repository.atualizar(id, dadosAtualizacao);
      
      // Processar dados após atualização
      const processedApostila = await this.processAfterUpdate(apostilaAtualizada);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', id);
        this.clearRelatedCache(`buscarPorSlug:${apostilaExistente.slug}`);
        this.clearRelatedCache(`buscarComConteudo:${id}`);
        if (dados.titulo) {
          this.clearRelatedCache(`buscarPorSlug:${this.gerarSlug(dados.titulo)}`);
        }
        if (apostilaExistente.concurso_id) {
          this.clearRelatedCache(`buscarPorConcurso:${apostilaExistente.concurso_id}`);
        }
        if (dados.concurso_id && dados.concurso_id !== apostilaExistente.concurso_id) {
          this.clearRelatedCache(`buscarPorConcurso:${dados.concurso_id}`);
        }
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Apostila atualizada com sucesso', {
        operationId,
        apostilaId: id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedApostila,
        message: 'Apostila atualizada com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `atualizarApostila:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Validar regras de negócio
   * @param data Dados a serem validados
   * @param operation Operação sendo executada
   * @param id ID do registro (para operações de atualização/exclusão)
   */
  protected async validateBusinessRules(data: unknown, operation: string, id?: string): Promise<void> {
    // Validações específicas de negócio para apostilas
    if (operation === 'excluir' && id) {
      // Verificar se a apostila tem progresso de usuários
      // Por enquanto, permitir exclusão (soft delete)
    }
  }
  
  /**
   * Validar entrada para criação de apostila
   * @param dados Dados da apostila
   */
  private async validateCreateApostilaInput(dados: CriarApostilaData): Promise<void> {
    if (!dados.titulo || dados.titulo.trim().length < 3) {
      throw new ValidationError('Título da apostila deve ter pelo menos 3 caracteres');
    }
    
    if (dados.disciplinas && !Array.isArray(dados.disciplinas)) {
      throw new ValidationError('Disciplinas deve ser um array');
    }
    
    if (dados.disciplinas && dados.disciplinas.length === 0) {
      throw new ValidationError('Pelo menos uma disciplina deve ser especificada');
    }
  }
  
  /**
   * Validar entrada para atualização de apostila
   * @param dados Dados para atualização
   */
  private async validateUpdateApostilaInput(dados: AtualizarApostilaData): Promise<void> {
    if (dados.titulo !== undefined && dados.titulo.trim().length < 3) {
      throw new ValidationError('Título da apostila deve ter pelo menos 3 caracteres');
    }
    
    if (dados.disciplinas !== undefined && !Array.isArray(dados.disciplinas)) {
      throw new ValidationError('Disciplinas deve ser um array');
    }
    
    if (dados.disciplinas !== undefined && dados.disciplinas.length === 0) {
      throw new ValidationError('Pelo menos uma disciplina deve ser especificada');
    }
  }
  
  /**
   * Validar entrada para marcar progresso
   * @param dados Dados do progresso
   */
  private async validateMarcarProgressoInput(dados: MarcarProgressoData): Promise<void> {
    if (!dados.usuarioId) {
      throw new ValidationError('ID do usuário é obrigatório');
    }
    
    if (!dados.conteudoId) {
      throw new ValidationError('ID do conteúdo é obrigatório');
    }
    
    if (dados.percentual < 0 || dados.percentual > 100) {
      throw new ValidationError('Percentual deve estar entre 0 e 100');
    }
  }
  
  /**
   * Gerar slug a partir de um texto
   * @param texto Texto para gerar slug
   * @returns Slug gerado
   */
  private gerarSlug(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }
}