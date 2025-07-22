import { BaseService, BaseServiceOptions } from '../../core/services/base-service.js';
import { CategoriasConcursos, ApiResponse } from '../../shared/types/index.js';
import { ValidationError, NotFoundError } from '../../core/errors/index.js';
import { ICategoriaRepository, FiltroCategoria } from './categoria.repository.js';
import { performance } from 'perf_hooks';

/**
 * Interface para serviço de categorias
 */
export interface ICategoriaService {
  buscarPorId(id: string): Promise<ApiResponse<CategoriasConcursos>>;
  buscarTodos(filtro?: FiltroCategoria): Promise<ApiResponse<CategoriasConcursos[]>>;
  criar(dados: Partial<CategoriasConcursos>): Promise<ApiResponse<CategoriasConcursos>>;
  atualizar(id: string, dados: Partial<CategoriasConcursos>): Promise<ApiResponse<CategoriasConcursos>>;
  excluir(id: string): Promise<ApiResponse<boolean>>;
  buscarPorSlug(slug: string): Promise<ApiResponse<CategoriasConcursos>>;
  buscarAtivas(): Promise<ApiResponse<CategoriasConcursos[]>>;
}

/**
 * Dados para criação de categoria
 */
export interface CriarCategoriaData {
  nome: string;
  descricao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
}

/**
 * Dados para atualização de categoria
 */
export interface AtualizarCategoriaData {
  nome?: string;
  descricao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  ativo?: boolean;
}

/**
 * Serviço de categorias
 */
export class CategoriaService extends BaseService<CategoriasConcursos, FiltroCategoria> implements ICategoriaService {
  protected readonly repository: ICategoriaRepository;
  /**
   * Construtor
   * @param categoriaRepository Repositório de categorias
   * @param options Opções do serviço
   */
  constructor(
    categoriaRepository: ICategoriaRepository,
    options?: Partial<BaseServiceOptions>
  ) {
    super(categoriaRepository, {
      serviceName: 'Categoria',
      enableCache: true,
      cacheTime: 900, // 15 minutos (categorias mudam pouco)
      ...options
    });
    this.repository = categoriaRepository;
    this.logger.info('Serviço de categorias inicializado');
  }
  
  /**
   * Buscar categoria por slug
   * @param slug Slug da categoria
   * @returns Resposta com a categoria
   */
  async buscarPorSlug(slug: string): Promise<ApiResponse<CategoriasConcursos>> {
    const startTime = performance.now();
    const operationId = `categoria-buscarPorSlug-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando categoria por slug', { operationId, slug });
      
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
            data: cached as CategoriasConcursos
          };
        }
      }
      
      // Buscar no repositório
      const categoria = await this.repository.buscarPorSlug(slug);
      
      if (!categoria) {
        const executionTime = performance.now() - startTime;
        this.logger.warn('Categoria não encontrada por slug', {
          operationId,
          slug,
          executionTimeMs: executionTime.toFixed(2)
        });
        
        return {
          success: false,
          message: 'Categoria não encontrada',
          error: 'NOT_FOUND'
        };
      }
      
      // Processar dados após busca
      const processedCategoria = await this.processAfterFind(categoria);
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache(`buscarPorSlug:${slug}`, processedCategoria);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Categoria encontrada por slug', {
        operationId,
        categoriaId: categoria.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedCategoria
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `buscarPorSlug:${slug}`, operationId, executionTime);
    }
  }
  
  /**
   * Buscar categorias ativas
   * @returns Resposta com as categorias ativas
   */
  async buscarAtivas(): Promise<ApiResponse<CategoriasConcursos[]>> {
    const startTime = performance.now();
    const operationId = `categoria-buscarAtivas-${Date.now()}`;
    
    try {
      this.logger.debug('Buscando categorias ativas', { operationId });
      
      // Verificar cache
      if (this.enableCache) {
        const cached = this.getFromCache('buscarAtivos');
        if (Array.isArray(cached)) {
          this.logger.debug('Cache hit para buscarAtivos', { operationId });
          return {
            success: true,
            data: cached as CategoriasConcursos[]
          };
        }
      }
      
      // Buscar no repositório
      const categorias = await this.repository.buscarAtivas();
      
      // Processar dados após busca
      const processedCategorias = await Promise.all(
        categorias.map(categoria => this.processAfterFind(categoria))
      );
      
      // Salvar no cache
      if (this.enableCache) {
        this.setCache('buscarAtivas', processedCategorias);
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.debug('Categorias ativas encontradas', {
        operationId,
        count: processedCategorias.length,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedCategorias
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      // Garantir que o retorno seja do tipo correto
      const result = this.handleError(error, 'buscarAtivos', operationId, executionTime);
      if (result && Array.isArray(result.data)) {
        return result as unknown as ApiResponse<CategoriasConcursos[]>;
      }
      return { ...(result as unknown as ApiResponse<CategoriasConcursos[]>), data: [] };
    }
  }
  
  /**
   * Criar categoria
   * @param dados Dados da categoria
   * @returns Resposta com a categoria criada
   */
  async criarCategoria(dados: CriarCategoriaData): Promise<ApiResponse<CategoriasConcursos>> {
    const startTime = performance.now();
    const operationId = `categoria-criarCategoria-${Date.now()}`;
    
    try {
      this.logger.debug('Criando nova categoria', { 
        operationId,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateCreateCategoriaInput(dados);
      
      // Verificar se já existe categoria com o mesmo nome
      const slug = this.gerarSlug(dados.nome);
      const categoriaExistente = await this.repository.buscarPorSlug(slug);
      
      if (categoriaExistente) {
        return {
          success: false,
          error: 'CATEGORIA_ALREADY_EXISTS',
          message: 'Já existe uma categoria com este nome'
        };
      }
      
      // Preparar dados da categoria
      const dadosCategoria: Partial<CategoriasConcursos> = {
        nome: dados.nome.trim(),
        slug,
        descricao: dados.descricao?.trim(),
        cor_primaria: dados.cor_primaria || '#3B82F6',
        cor_secundaria: dados.cor_secundaria || '#1E40AF',
        ativo: true
      };
      
      // Criar categoria
      const categoria = await this.repository.criar(dadosCategoria);
      
      // Processar dados após criação
      const processedCategoria = await this.processAfterCreate(categoria);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('criar');
        this.clearRelatedCache('buscarAtivas');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Categoria criada com sucesso', {
        operationId,
        categoriaId: categoria.id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedCategoria,
        message: 'Categoria criada com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, 'criarCategoria', operationId, executionTime);
    }
  }
  
  /**
   * Atualizar categoria
   * @param id ID da categoria
   * @param dados Dados para atualização
   * @returns Resposta com a categoria atualizada
   */
  async atualizarCategoria(id: string, dados: AtualizarCategoriaData): Promise<ApiResponse<CategoriasConcursos>> {
    const startTime = performance.now();
    const operationId = `categoria-atualizarCategoria-${Date.now()}`;
    
    try {
      this.logger.debug('Atualizando categoria', { 
        operationId,
        categoriaId: id,
        dados: this.sanitizeLogData(dados)
      });
      
      // Validar entrada
      await this.validateUpdateCategoriaInput(dados);
      
      // Verificar se categoria existe
      const categoriaExistente = await this.repository.buscarPorId(id);
      
      if (!categoriaExistente) {
        throw new NotFoundError('Categoria não encontrada');
      }
      
      // Se nome está sendo alterado, verificar se já existe outra categoria com o mesmo nome
      if (dados.nome && dados.nome !== categoriaExistente.nome) {
        const slug = this.gerarSlug(dados.nome);
        const categoriaComMesmoNome = await this.repository.buscarPorSlug(slug);
        
        if (categoriaComMesmoNome && categoriaComMesmoNome.id !== id) {
          return {
            success: false,
            error: 'CATEGORIA_ALREADY_EXISTS',
            message: 'Já existe uma categoria com este nome'
          };
        }
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao: Partial<CategoriasConcursos> = {};
      
      if (dados.nome) {
        dadosAtualizacao.nome = dados.nome.trim();
        dadosAtualizacao.slug = this.gerarSlug(dados.nome);
      }
      
      if (dados.descricao !== undefined) {
        dadosAtualizacao.descricao = dados.descricao?.trim();
      }
      
      if (dados.cor_primaria) {
        dadosAtualizacao.cor_primaria = dados.cor_primaria;
      }
      
      if (dados.cor_secundaria) {
        dadosAtualizacao.cor_secundaria = dados.cor_secundaria;
      }
      
      if (dados.ativo !== undefined) {
        dadosAtualizacao.ativo = dados.ativo;
      }
      
      // Atualizar categoria
      const categoriaAtualizada = await this.repository.atualizar(id, dadosAtualizacao);
      
      // Processar dados após atualização
      const processedCategoria = await this.processAfterUpdate(categoriaAtualizada);
      
      // Limpar cache relacionado
      if (this.enableCache) {
        this.clearRelatedCache('atualizar', id);
        this.clearRelatedCache(`buscarPorSlug:${categoriaExistente.slug}`);
        if (dados.nome) {
          this.clearRelatedCache(`buscarPorSlug:${this.gerarSlug(dados.nome)}`);
        }
        this.clearRelatedCache('buscarAtivas');
      }
      
      const executionTime = performance.now() - startTime;
      this.logger.info('Categoria atualizada com sucesso', {
        operationId,
        categoriaId: id,
        executionTimeMs: executionTime.toFixed(2)
      });
      
      return {
        success: true,
        data: processedCategoria,
        message: 'Categoria atualizada com sucesso'
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.handleError(error, `atualizarCategoria:${id}`, operationId, executionTime);
    }
  }
  
  /**
   * Validar regras de negócio
   * @param data Dados a serem validados
   * @param operation Operação sendo executada
   * @param id ID do registro (para operações de atualização/exclusão)
   */
  protected async validateBusinessRules(data: unknown, operation: string, id?: string): Promise<void> {
    // Validações específicas de negócio para categorias
    if (operation === 'excluir' && id) {
      // Verificar se a categoria tem concursos associados
      // Por enquanto, permitir exclusão (soft delete)
    }
  }
  
  /**
   * Validar entrada para criação de categoria
   * @param dados Dados da categoria
   */
  private async validateCreateCategoriaInput(dados: CriarCategoriaData): Promise<void> {
    if (!dados.nome || dados.nome.trim().length < 2) {
      throw new ValidationError('Nome da categoria deve ter pelo menos 2 caracteres');
    }
    
    if (dados.cor_primaria && !this.isValidHexColor(dados.cor_primaria)) {
      throw new ValidationError('Cor primária deve estar no formato hexadecimal (#RRGGBB)');
    }
    
    if (dados.cor_secundaria && !this.isValidHexColor(dados.cor_secundaria)) {
      throw new ValidationError('Cor secundária deve estar no formato hexadecimal (#RRGGBB)');
    }
  }
  
  /**
   * Validar entrada para atualização de categoria
   * @param dados Dados para atualização
   */
  private async validateUpdateCategoriaInput(dados: AtualizarCategoriaData): Promise<void> {
    if (dados.nome !== undefined && dados.nome.trim().length < 2) {
      throw new ValidationError('Nome da categoria deve ter pelo menos 2 caracteres');
    }
    
    if (dados.cor_primaria && !this.isValidHexColor(dados.cor_primaria)) {
      throw new ValidationError('Cor primária deve estar no formato hexadecimal (#RRGGBB)');
    }
    
    if (dados.cor_secundaria && !this.isValidHexColor(dados.cor_secundaria)) {
      throw new ValidationError('Cor secundária deve estar no formato hexadecimal (#RRGGBB)');
    }
  }
  
  /**
   * Validar cor hexadecimal
   * @param color Cor a ser validada
   * @returns True se cor é válida
   */
  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
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