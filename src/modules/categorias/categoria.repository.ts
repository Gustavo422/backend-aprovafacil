import { BaseRepository, BaseRepositoryOptions } from '../../core/database/base-repository.js';
import { CategoriasConcursos, FiltroBase } from '../../shared/types/index.js';
// import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { ValidationError } from '../../core/errors/index.js';
import { IBaseRepository } from '../../core/interfaces/index.js';

/**
 * Interface para repositório de categorias
 */
export interface ICategoriaRepository extends IBaseRepository<CategoriasConcursos, FiltroCategoria> {
  buscarPorSlug(slug: string): Promise<CategoriasConcursos | null>;
  buscarAtivas(): Promise<CategoriasConcursos[]>;
}

/**
 * Filtro para categorias
 */
export interface FiltroCategoria extends FiltroBase {
  /**
   * Filtrar por status
   */
  ativo?: boolean;
  
  /**
   * Busca textual
   */
  search?: string;
  
  /**
   * Filtrar por cor
   */
  cor_primaria?: string;
}

/**
 * Repositório de categorias
 */
export class CategoriaRepository extends BaseRepository<CategoriasConcursos, FiltroCategoria> implements ICategoriaRepository {
  /**
   * Construtor
   * @param options Opções do repositório
   */
  constructor(options?: Partial<BaseRepositoryOptions>) {
    super({
      tableName: 'categorias_concursos',
      softDelete: true,
      ...options,
    });
    
    this.logger.info('Repositório de categorias inicializado');
  }
  
  /**
   * Buscar categoria por slug
   * @param slug Slug da categoria
   * @returns Categoria encontrada ou null
   */
  async buscarPorSlug(slug: string): Promise<CategoriasConcursos | null> {
    try {
      this.logger.debug(`Buscando categoria por slug: ${slug}`);
      
      if (!slug) {
        throw new ValidationError('Slug não pode ser vazio');
      }
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('slug', slug)
        .single();
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      if (!result.data) {
        this.logger.debug(`Categoria com slug ${slug} não encontrada`);
        return null;
      }
      
      this.logger.debug(`Categoria com slug ${slug} encontrada`);
      return result.data as CategoriasConcursos;
    } catch (error) {
      this.handleError(`buscarPorSlug:${slug}`, error);
      return null;
    }
  }
  
  /**
   * Buscar categorias ativas
   * @returns Lista de categorias ativas
   */
  async buscarAtivas(): Promise<CategoriasConcursos[]> {
    try {
      this.logger.debug('Buscando categorias ativas');
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const categorias = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${categorias.length} categorias ativas encontradas`);
      
      return categorias as CategoriasConcursos[];
    } catch (error) {
      this.handleError('buscarAtivas', error);
      return [];
    }
  }
  
  /**
   * Aplicar filtros à query
   * @param query Query base
   * @param filtro Filtro a ser aplicado
   * @returns Query com filtros aplicados
   */
  protected applyFilters<TQuery extends object>(query: TQuery, filtro: FiltroCategoria): TQuery {
    let q = query as unknown;
    if (filtro.ativo !== undefined) {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('ativo', filtro.ativo);
    }
    if (filtro.search) {
      q = (q as { or: (expr: string) => unknown }).or(`nome.ilike.%${filtro.search}%,descricao.ilike.%${filtro.search}%`);
    }
    if (filtro.cor_primaria) {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('cor_primaria', filtro.cor_primaria);
    }
    return q as TQuery;
  }
  
  /**
   * Preparar dados para inserção
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForInsert(dados: Partial<CategoriasConcursos>): Record<string, unknown> {
    const preparedData = { ...dados as Record<string, unknown> };
    
    // Gerar slug se não fornecido
    if (!('slug' in preparedData) && typeof preparedData.nome === 'string') {
      preparedData.slug = this.gerarSlug(preparedData.nome);
    }
    
    // Definir status padrão se não fornecido
    if (preparedData.ativo === undefined) {
      preparedData.ativo = true;
    }
    
    // Definir cores padrão se não fornecidas
    if (!preparedData.cor_primaria) {
      preparedData.cor_primaria = '#3B82F6'; // Azul padrão
    }
    
    if (!preparedData.cor_secundaria) {
      preparedData.cor_secundaria = '#1E40AF'; // Azul escuro padrão
    }
    
    // Adicionar data de criação
    preparedData.criado_em = new Date().toISOString();
    preparedData.atualizado_em = new Date().toISOString();
    
    return preparedData;
  }
  
  /**
   * Preparar dados para atualização
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForUpdate(dados: Partial<CategoriasConcursos>): Record<string, unknown> {
    const preparedData = { ...dados as Record<string, unknown> };
    
    // Gerar slug se nome foi alterado e slug não foi fornecido
    if (!('slug' in preparedData) && typeof preparedData.nome === 'string') {
      preparedData.slug = this.gerarSlug(preparedData.nome);
    }
    
    // Adicionar data de atualização
    preparedData.atualizado_em = new Date().toISOString();
    
    return preparedData;
  }
  
  /**
   * Validar dados
   * @param dados Dados a serem validados
   * @param isUpdate Se é uma operação de atualização
   */
  protected validateData(dados: Partial<CategoriasConcursos>, isUpdate: boolean = false): void {
    super.validateData(dados, isUpdate);
    
    // Validações específicas para categoria
    if (!isUpdate && !dados.nome) {
      throw new ValidationError('Nome da categoria é obrigatório');
    }
    
    // Validar cores (formato hexadecimal)
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
  protected gerarSlug(texto: string): string {
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