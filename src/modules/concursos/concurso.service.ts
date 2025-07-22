import { BaseService, BaseServiceOptions } from '../../core/services/base-service.js';
import { IConcursoService, IConcursoRepository } from '../../core/interfaces/index.js';
import { Concurso, ApiResponse } from '../../shared/types/index.js';
import { ValidationError, NotFoundError } from '../../core/errors/index.js';
import { FiltroConcurso } from './concurso.repository.js';
import { performance } from 'perf_hooks';
import { URL } from 'url';

/**
 * Dados para criação de concurso
 */
export interface CriarConcursoData {
  nome: string;
  descricao?: string;
  categoria_id: string;
  ano?: number;
  banca?: string;
  url_edital?: string;
  data_prova?: Date;
  vagas?: number;
  salario?: number;
  nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
  multiplicador_questoes?: number;
}

/**
 * Dados para atualização de concurso
 */
export interface AtualizarConcursoData {
  nome?: string;
  descricao?: string;
  categoria_id?: string;
  ano?: number;
  banca?: string;
  url_edital?: string;
  data_prova?: Date;
  vagas?: number;
  salario?: number;
  nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
  multiplicador_questoes?: number;
  ativo?: boolean;
}

/**
 * Serviço de concursos
 */
export class ConcursoService extends BaseService<Concurso, FiltroConcurso> implements IConcursoService {
  /**
   * Construtor
   * @param concursoRepository Repositório de concursos
   * @param options Opções do serviço
   */
  constructor(
    concursoRepository: IConcursoRepository,
    options?: Partial<BaseServiceOptions>
  ) {
    super(concursoRepository, {
      serviceName: 'Concurso',
      enableCache: true,
      cacheTime: 600, // 10 minutos
      ...options
    });
    
    this.logger.info('Serviço de concursos inicializado');
  }
  
  /**
   * Buscar concurso por slug
   * @param slug Slug do concurso
   * @returns Resposta com o concurso
   */
  async buscarPorSlug(slug: string): Promise<ApiResponse<Concurso>> {
    const startTime = performance.now();
    const operationId = `concurso-buscarPorSlug-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando concurso por slug', { operationId, slug });
      
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
            data: cached as Concurso
          };
        }
      }
      
      // Buscar no repositório
      const concurso = await (this.repository as IConcursoRepository).buscarPorSlug(slug);
      
      if (!concurso) {
        const executionTime = performance.now() - startTime;
        this.logger.warn('Concurso não encontrado por slug', {
          operationId,
          slug,
          executionTimeMs: executionTime.toFixed(2)
        });
        
        return {
          success: false,
          message: 'Concurso não encontrado',
          error: 'NOT_FOUND'
        };
      }
      
      // Processar dados após busca
      const processedConcurso = await this.processAfterFind(concurso);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorSlug:${slug}`, processedConcurso);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Concurso encontrado por slug', {
        operationId,
        concursoId: concurso.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedConcurso
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `buscarPorSlug:${slug}`, operationId, executionTime);
    }
  }
  
  /**
   * Buscar concursos por categoria
   * @param categoriaId ID da categoria
   * @returns Resposta com os concursos
   */
  async buscarPorCategoria(categoriaId: string): Promise<ApiResponse<Concurso[]>> {
    const startTime = performance.now();
    const operationId = `concurso-buscarPorCategoria-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando concursos por categoria', { operationId, categoriaId });
      
      // Validar entrada
      if (!categoriaId) {
        throw new ValidationError('ID da categoria é obrigatório');
      }
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache(`buscarPorCategoria:${categoriaId}`);
        if (Array.isArray(cached)) {
          this.logger.debug('Cache hit para buscarPorCategoria', { operationId });
          return {
            success: true,
            data: cached as Concurso[]
          };
        }
      }
      
      // Buscar no repositório
      const concursos = await (this.repository as IConcursoRepository).buscarPorCategoria(categoriaId);
      
      // Processar dados após busca
      const processedConcursos = await Promise.all(
        concursos.map(concurso => this.processAfterFind(concurso))
      );
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorCategoria:${categoriaId}`, processedConcursos);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Concursos encontrados por categoria', {
        operationId,
        categoriaId,
        count: processedConcursos.length,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedConcursos
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, `buscarPorCategoria:${categoriaId}`, operationId, executionTime);
      if (result && Array.isArray(result.data)) {
        return result as unknown as ApiResponse<Concurso[]>;
      }
      return { ...(result as unknown as ApiResponse<Concurso[]>), data: [] };
    }
  }
  
  /**
   * Buscar concursos ativos
   * @returns Resposta com os concursos ativos
   */
  async buscarAtivos(): Promise<ApiResponse<Concurso[]>> {
    const startTime = performance.now();
    const operationId = `concurso-buscarAtivos-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando concursos ativos', { operationId });
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache('buscarAtivos');
        if (Array.isArray(cached)) {
          this.logger.debug('Cache hit para buscarAtivos', { operationId });
          return {
            success: true,
            data: cached as Concurso[]
          };
        }
      }
      
      // Buscar no repositório
      const concursos = await (this.repository as IConcursoRepository).buscarAtivos();
      
      // Processar dados após busca
      const processedConcursos = await Promise.all(
        concursos.map(concurso => this.processAfterFind(concurso))
      );
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache('buscarAtivos', processedConcursos);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Concursos ativos encontrados', {
        operationId,
        count: processedConcursos.length,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedConcursos
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, 'buscarAtivos', operationId, executionTime);
      if (result && Array.isArray(result.data)) {
        return result as unknown as ApiResponse<Concurso[]>;
      }
      return { ...(result as unknown as ApiResponse<Concurso[]>), data: [] };
    }
  }
  
  /**
   * Criar concurso
   * @param dados Dados do concurso
   * @returns Resposta com o concurso criado
   */
  async criarConcurso(dados: CriarConcursoData): Promise<ApiResponse<Concurso>> {
    const startTime = performance.now();
    const operationId = `concurso-criarConcurso-${Date.now()}`;
    
    try {
      this.logger.debug('Criando novo concurso', { 
        operationId,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateCreateConcursoInput(dados);
      
      // Verificar se já existe concurso com o mesmo nome
      const slug = this.gerarSlug(dados.nome);
      const concursoExistente = await (this.repository as IConcursoRepository).buscarPorSlug(slug);
      
      if (concursoExistente) {
        return {
          success: false,
          error: 'CONCURSO_ALREADY_EXISTS',
          message: 'Já existe um concurso com este nome'
        };
      }
      
      // Preparar dados do concurso
      const dadosConcurso: Partial<Concurso> = {
        nome: dados.nome.trim(),
        slug,
        descricao: dados.descricao?.trim(),
        categoria_id: dados.categoria_id,
        ano: dados.ano,
        banca: dados.banca?.trim(),
        url_edital: dados.url_edital?.trim(),
        data_prova: dados.data_prova,
        vagas: dados.vagas,
        salario: dados.salario,
        nivel_dificuldade: dados.nivel_dificuldade || 'medio',
        multiplicador_questoes: dados.multiplicador_questoes || 1,
        ativo: true
      };
      
      // Criar concurso
      const concurso = await this.repository.criar(dadosConcurso);
      
      // Processar dados após criação
      const processedConcurso = await this.processAfterCreate(concurso);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('criar');
        this.clearRelatedCache(`buscarPorCategoria:${dados.categoria_id}`);
        this.clearRelatedCache('buscarAtivos');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Concurso criado com sucesso', {
        operationId,
        concursoId: concurso.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedConcurso,
        message: 'Concurso criado com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, 'criarConcurso', operationId, executionTime);
    }
  }
  
  /**
   * Atualizar concurso
   * @param id ID do concurso
   * @param dados Dados para atualização
   * @returns Resposta com o concurso atualizado
   */
  async atualizarConcurso(id: string, dados: AtualizarConcursoData): Promise<ApiResponse<Concurso>> {
    const startTime = performance.now();
    const operationId = `concurso-atualizarConcurso-${Date.now()}`;
    
    try {
      this.logger.debug('Atualizando concurso', { 
        operationId,
        concursoId: id,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateUpdateConcursoInput(dados);
      
      // Verificar se concurso existe
      const concursoExistente = await this.repository.buscarPorId(id);
      
      if (!concursoExistente) {
        throw new NotFoundError('Concurso não encontrado');
      }
      
      // Se nome está sendo alterado, verificar se já existe outro concurso com o mesmo nome
      if (dados.nome && dados.nome !== concursoExistente.nome) {
        const slug = this.gerarSlug(dados.nome);
        const concursoComMesmoNome = await (this.repository as IConcursoRepository).buscarPorSlug(slug);
        
        if (concursoComMesmoNome && concursoComMesmoNome.id !== id) {
          return {
            success: false,
            error: 'CONCURSO_ALREADY_EXISTS',
            message: 'Já existe um concurso com este nome'
          };
        }
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao: Partial<Concurso> = {};
      
      if (dados.nome) {
        dadosAtualizacao.nome = dados.nome.trim();
        dadosAtualizacao.slug = this.gerarSlug(dados.nome);
      }
      
      if (dados.descricao !== undefined) {
        dadosAtualizacao.descricao = dados.descricao?.trim();
      }
      
      if (dados.categoria_id) {
        dadosAtualizacao.categoria_id = dados.categoria_id;
      }
      
      if (dados.ano !== undefined) {
        dadosAtualizacao.ano = dados.ano;
      }
      
      if (dados.banca !== undefined) {
        dadosAtualizacao.banca = dados.banca?.trim();
      }
      
      if (dados.url_edital !== undefined) {
        dadosAtualizacao.url_edital = dados.url_edital?.trim();
      }
      
      if (dados.data_prova !== undefined) {
        dadosAtualizacao.data_prova = dados.data_prova;
      }
      
      if (dados.vagas !== undefined) {
        dadosAtualizacao.vagas = dados.vagas;
      }
      
      if (dados.salario !== undefined) {
        dadosAtualizacao.salario = dados.salario;
      }
      
      if (dados.nivel_dificuldade) {
        dadosAtualizacao.nivel_dificuldade = dados.nivel_dificuldade;
      }
      
      if (dados.multiplicador_questoes !== undefined) {
        dadosAtualizacao.multiplicador_questoes = dados.multiplicador_questoes;
      }
      
      if (dados.ativo !== undefined) {
        dadosAtualizacao.ativo = dados.ativo;
      }
      
      // Atualizar concurso
      const concursoAtualizado = await this.repository.atualizar(id, dadosAtualizacao);
      
      // Processar dados após atualização
      const processedConcurso = await this.processAfterUpdate(concursoAtualizado);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', id);
        this.clearRelatedCache(`buscarPorSlug:${concursoExistente.slug}`);
        if (dados.nome) {
          this.clearRelatedCache(`buscarPorSlug:${this.gerarSlug(dados.nome)}`);
        }
        this.clearRelatedCache(`buscarPorCategoria:${concursoExistente.categoria_id}`);
        if (dados.categoria_id && dados.categoria_id !== concursoExistente.categoria_id) {
          this.clearRelatedCache(`buscarPorCategoria:${dados.categoria_id}`);
        }
        this.clearRelatedCache('buscarAtivos');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Concurso atualizado com sucesso', {
        operationId,
        concursoId: id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedConcurso,
        message: 'Concurso atualizado com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `atualizarConcurso:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Validar regras de negócio
   * @param data Dados a serem validados
   * @param operation Operação sendo executada
   * @param id ID do registro (para operações de atualização/exclusão)
   */
  protected async validateBusinessRules(data: unknown, operation: string, id?: string): Promise<void> {
    // Validações específicas de negócio para concursos
    if (operation === 'excluir' && id) {
      // Verificar se o concurso tem simulados ou outros dados relacionados
      // Por enquanto, permitir exclusão
    }
  }
  
  /**
   * Validar entrada para criação de concurso
   * @param dados Dados do concurso
   */
  private async validateCreateConcursoInput(dados: CriarConcursoData): Promise<void> {
    if (!dados.nome || dados.nome.trim().length < 3) {
      throw new ValidationError('Nome do concurso deve ter pelo menos 3 caracteres');
    }
    
    if (!dados.categoria_id) {
      throw new ValidationError('Categoria é obrigatória');
    }
    
    if (dados.ano && (dados.ano < 1900 || dados.ano > 2100)) {
      throw new ValidationError('Ano deve estar entre 1900 e 2100');
    }
    
    if (dados.vagas !== undefined && dados.vagas < 0) {
      throw new ValidationError('Número de vagas não pode ser negativo');
    }
    
    if (dados.salario !== undefined && dados.salario < 0) {
      throw new ValidationError('Salário não pode ser negativo');
    }
    
    if (dados.multiplicador_questoes !== undefined && dados.multiplicador_questoes <= 0) {
      throw new ValidationError('Multiplicador de questões deve ser maior que zero');
    }
    
    if (dados.nivel_dificuldade && !['facil', 'medio', 'dificil'].includes(dados.nivel_dificuldade)) {
      throw new ValidationError('Nível de dificuldade deve ser facil, medio ou dificil');
    }
    
    if (dados.url_edital && !this.isValidUrl(dados.url_edital)) {
      throw new ValidationError('URL do edital inválida');
    }
  }
  
  /**
   * Validar entrada para atualização de concurso
   * @param dados Dados para atualização
   */
  private async validateUpdateConcursoInput(dados: AtualizarConcursoData): Promise<void> {
    if (dados.nome !== undefined && dados.nome.trim().length < 3) {
      throw new ValidationError('Nome do concurso deve ter pelo menos 3 caracteres');
    }
    
    if (dados.ano !== undefined && (dados.ano < 1900 || dados.ano > 2100)) {
      throw new ValidationError('Ano deve estar entre 1900 e 2100');
    }
    
    if (dados.vagas !== undefined && dados.vagas < 0) {
      throw new ValidationError('Número de vagas não pode ser negativo');
    }
    
    if (dados.salario !== undefined && dados.salario < 0) {
      throw new ValidationError('Salário não pode ser negativo');
    }
    
    if (dados.multiplicador_questoes !== undefined && dados.multiplicador_questoes <= 0) {
      throw new ValidationError('Multiplicador de questões deve ser maior que zero');
    }
    
    if (dados.nivel_dificuldade && !['facil', 'medio', 'dificil'].includes(dados.nivel_dificuldade)) {
      throw new ValidationError('Nível de dificuldade deve ser facil, medio ou dificil');
    }
    
    if (dados.url_edital && !this.isValidUrl(dados.url_edital)) {
      throw new ValidationError('URL do edital inválida');
    }
  }
  
  /**
   * Validar URL
   * @param url URL a ser validada
   * @returns True se URL é válida
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
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