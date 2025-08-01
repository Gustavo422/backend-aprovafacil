import { BaseRepository, BaseRepositoryOptions } from '../../core/database/base-repository.js';
import { IConcursoRepository } from '../../core/interfaces/index.js';
import { Concurso, FiltroBase } from '../../shared/types/index.js';
import { ValidationError } from '../../core/errors/index.js';

/**
 * Filtro para concursos
 */
export interface FiltroConcurso extends FiltroBase {
  /**
   * Filtrar por categoria
   */
  categoria_id?: string;
  
  /**
   * Filtrar por status
   */
  status?: 'ativo' | 'inativo' | 'todos';
  
  /**
   * Busca textual
   */
  search?: string;
  
  /**
   * Filtrar por data de início
   */
  data_inicio?: string;
  
  /**
   * Filtrar por data de término
   */
  data_fim?: string;
  
  /**
   * Filtrar por banca
   */
  banca?: string;
  
  /**
   * Filtrar por ano
   */
  ano?: number;
  
  /**
   * Filtrar por nível de dificuldade
   */
  nivel_dificuldade?: 'facil' | 'medio' | 'dificil';
}

/**
 * Repositório de concursos
 */
export class ConcursoRepository extends BaseRepository<Concurso, FiltroConcurso> implements IConcursoRepository {
  /**
   * Construtor
   * @param options Opções do repositório
   */
  constructor(options?: Partial<BaseRepositoryOptions>) {
    super({
      tableName: 'concursos',
      softDelete: true,
      ...options,
    });
    
    this.logger.info('Repositório de concursos inicializado');
  }
  
  /**
   * Buscar concurso por slug
   * @param slug Slug do concurso
   * @returns Concurso encontrado ou null
   */
  async buscarPorSlug(slug: string): Promise<Concurso | null> {
    try {
      this.logger.debug(`Buscando concurso por slug: ${slug}`);
      
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
        this.logger.debug(`Concurso com slug ${slug} não encontrado`);
        return null;
      }
      
      this.logger.debug(`Concurso com slug ${slug} encontrado`);
      return result.data as Concurso;
    } catch (error) {
      this.handleError(`buscarPorSlug:${slug}`, error);
      return null;
    }
  }
  
  /**
   * Buscar concursos por categoria
   * @param categoriaId ID da categoria
   * @returns Lista de concursos
   */
  async buscarPorCategoria(categoriaId: string): Promise<Concurso[]> {
    try {
      this.logger.debug(`Buscando concursos por categoria: ${categoriaId}`);
      
      if (!categoriaId) {
        throw new ValidationError('ID da categoria não pode ser vazio');
      }
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('categoria_id', categoriaId);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const concursos = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${concursos.length} concursos encontrados para categoria ${categoriaId}`);
      
      return concursos as Concurso[];
    } catch (error) {
      this.handleError(`buscarPorCategoria:${categoriaId}`, error);
      return [];
    }
  }
  
  /**
   * Buscar concursos ativos
   * @returns Lista de concursos ativos
   */
  async buscarAtivos(): Promise<Concurso[]> {
    try {
      this.logger.debug('Buscando concursos ativos');
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('ativo', true);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const concursos = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${concursos.length} concursos ativos encontrados`);
      
      return concursos as Concurso[];
    } catch (error) {
      this.handleError('buscarAtivos', error);
      return [];
    }
  }
  
  /**
   * Buscar concursos por banca
   * @param banca Nome da banca
   * @returns Lista de concursos
   */
  async buscarPorBanca(banca: string): Promise<Concurso[]> {
    try {
      this.logger.debug(`Buscando concursos por banca: ${banca}`);
      
      if (!banca) {
        throw new ValidationError('Nome da banca não pode ser vazio');
      }
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .ilike('banca', `%${banca}%`);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const concursos = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${concursos.length} concursos encontrados para banca ${banca}`);
      
      return concursos as Concurso[];
    } catch (error) {
      this.handleError(`buscarPorBanca:${banca}`, error);
      return [];
    }
  }
  
  /**
   * Buscar concursos por ano
   * @param ano Ano do concurso
   * @returns Lista de concursos
   */
  async buscarPorAno(ano: number): Promise<Concurso[]> {
    try {
      this.logger.debug(`Buscando concursos por ano: ${ano}`);
      
      if (!ano || ano < 1900 || ano > 2100) {
        throw new ValidationError('Ano inválido');
      }
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('ano', ano);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const concursos = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${concursos.length} concursos encontrados para o ano ${ano}`);
      
      return concursos as Concurso[];
    } catch (error) {
      this.handleError(`buscarPorAno:${ano}`, error);
      return [];
    }
  }
  
  /**
   * Aplicar filtros à query
   * @param query Query base
   * @param filtro Filtro a ser aplicado
   * @returns Query com filtros aplicados
   */
  protected applyFilters<TQuery extends object>(query: TQuery, filtro: FiltroConcurso): TQuery {
    // O uso de 'unknown' aqui é necessário devido à tipagem dinâmica do builder do Supabase
    let q = query as unknown;
    if (filtro.categoria_id) {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('categoria_id', filtro.categoria_id);
    }
    if (filtro.status && filtro.status !== 'todos') {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('ativo', filtro.status === 'ativo');
    }
    if (filtro.search) {
      q = (q as { or: (expr: string) => unknown }).or(`nome.ilike.%${filtro.search}%,descricao.ilike.%${filtro.search}%,banca.ilike.%${filtro.search}%`);
    }
    if (filtro.data_inicio) {
      q = (q as { gte: (field: string, value: unknown) => unknown }).gte('data_prova', filtro.data_inicio);
    }
    if (filtro.data_fim) {
      q = (q as { lte: (field: string, value: unknown) => unknown }).lte('data_prova', filtro.data_fim);
    }
    if (filtro.banca) {
      q = (q as { ilike: (field: string, value: string) => unknown }).ilike('banca', `%${filtro.banca}%`);
    }
    if (filtro.ano) {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('ano', filtro.ano);
    }
    if (filtro.nivel_dificuldade) {
      q = (q as { eq: (field: string, value: unknown) => unknown }).eq('nivel_dificuldade', filtro.nivel_dificuldade);
    }
    return q as TQuery;
  }
  
  /**
   * Preparar dados para inserção
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForInsert(dados: Partial<Concurso>): Record<string, unknown> {
    const preparedData = { ...dados as Record<string, unknown> };
    // Gerar slug se não fornecido
    if (!('slug' in preparedData) && typeof preparedData.nome === 'string') {
      preparedData.slug = this.gerarSlug(preparedData.nome);
    }
    
    // Definir status padrão se não fornecido
    if (preparedData.ativo === undefined) {
      preparedData.ativo = true;
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
  protected prepareDataForUpdate(dados: Partial<Concurso>): Record<string, unknown> {
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
  protected validateData(dados: Partial<Concurso>, isUpdate: boolean = false): void {
    super.validateData(dados, isUpdate);
    
    // Validações específicas para concurso
    if (!isUpdate && !dados.nome) {
      throw new ValidationError('Nome do concurso é obrigatório');
    }
    
    if (!isUpdate && !dados.categoria_id) {
      throw new ValidationError('Categoria do concurso é obrigatória');
    }
    
    // Validar nível de dificuldade
    if (dados.nivel_dificuldade && 
        !['facil', 'medio', 'dificil'].includes(dados.nivel_dificuldade)) {
      throw new ValidationError('Nível de dificuldade inválido. Deve ser facil, medio ou dificil');
    }
    
    // Validar ano
    if (dados.ano && (dados.ano < 1900 || dados.ano > 2100)) {
      throw new ValidationError('Ano inválido. Deve estar entre 1900 e 2100');
    }
    
    // Validar salário
    if (dados.salario !== undefined && dados.salario < 0) {
      throw new ValidationError('Salário não pode ser negativo');
    }
    
    // Validar vagas
    if (dados.vagas !== undefined && dados.vagas < 0) {
      throw new ValidationError('Número de vagas não pode ser negativo');
    }
    
    // Validar multiplicador de questões
    if (dados.multiplicador_questoes !== undefined && dados.multiplicador_questoes <= 0) {
      throw new ValidationError('Multiplicador de questões deve ser maior que zero');
    }
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