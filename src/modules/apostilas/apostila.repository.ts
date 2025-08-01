import { BaseRepository, BaseRepositoryOptions } from '../../core/database/base-repository.js';
import { IApostilaRepository } from '../../core/interfaces/index.js';
import { Apostila, ConteudoApostila, FiltroBase } from '../../shared/types/index.js';
// import { EnhancedLogger, getEnhancedLogger } from '../../lib/logging/enhanced-logging-service.js';
import { NotFoundError, ValidationError } from '../../core/errors/index.js';
/**
 * Filtro para apostilas
 */
export interface FiltroApostila extends FiltroBase {
  /**
   * Filtrar por categoria
   */
  categoria_id?: string;
  
  /**
   * Filtrar por concurso
   */
  concurso_id?: string;
  
  /**
   * Busca textual
   */
  search?: string;
  
  /**
   * Filtrar por disciplinas
   */
  disciplina?: string;
  
  /**
   * Filtrar por status
   */
  ativo?: boolean;
}

/**
 * Repositório de apostilas
 */
export class ApostilaRepository extends BaseRepository<Apostila, FiltroApostila> implements IApostilaRepository {
  /**
   * Construtor
   * @param options Opções do repositório
   */
  constructor(options?: Partial<BaseRepositoryOptions>) {
    super({
      tableName: 'apostilas',
      softDelete: true,
      ...options,
    });
    
    this.logger.info('Repositório de apostilas inicializado');
  }
  
  /**
   * Buscar apostila por slug
   * @param slug Slug da apostila
   * @returns Apostila encontrada ou null
   */
  async buscarPorSlug(slug: string): Promise<Apostila | null> {
    try {
      this.logger.debug(`Buscando apostila por slug: ${slug}`);
      
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
        this.logger.debug(`Apostila com slug ${slug} não encontrada`);
        return null;
      }
      
      this.logger.debug(`Apostila com slug ${slug} encontrada`);
      return result.data as Apostila;
    } catch (error) {
      this.handleError(`buscarPorSlug:${slug}`, error);
      return null;
    }
  }
  
  /**
   * Buscar apostilas por concurso
   * @param concursoId ID do concurso
   * @returns Lista de apostilas
   */
  async buscarPorConcurso(concursoId: string): Promise<Apostila[]> {
    try {
      this.logger.debug(`Buscando apostilas por concurso: ${concursoId}`);
      
      if (!concursoId) {
        throw new ValidationError('ID do concurso não pode ser vazio');
      }
      
      // Criar query
      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('concurso_id', concursoId);
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const apostilas = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${apostilas.length} apostilas encontradas para concurso ${concursoId}`);
      
      return apostilas as Apostila[];
    } catch (error) {
      this.handleError(`buscarPorConcurso:${concursoId}`, error);
      return [];
    }
  }
  
  /**
   * Buscar apostila com conteúdo
   * @param id ID da apostila
   * @returns Apostila com conteúdo ou null
   */
  async buscarComConteudo(id: string): Promise<Apostila & { conteudo: ConteudoApostila[] }> {
    try {
      this.logger.debug(`Buscando apostila com conteúdo: ${id}`);
      
      // Validar ID
      this.validateId(id);
      
      // Buscar apostila
      const apostila = await this.buscarPorId(id);
      
      if (!apostila) {
        throw new NotFoundError(`Apostila com ID ${id} não encontrada`);
      }
      
      // Buscar conteúdo
      const query = this.supabase
        .from('conteudo_apostilas')
        .select('*')
        .eq('apostila_id', id)
        .order('numero_modulo', { ascending: true });
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      const conteudo = Array.isArray(result.data) ? result.data : [];
      
      this.logger.debug(`${conteudo.length} módulos de conteúdo encontrados para apostila ${id}`);
      
      return {
        ...apostila,
        conteudo: conteudo as ConteudoApostila[],
      };
    } catch (error) {
      this.handleError(`buscarComConteudo:${id}`, error);
      throw error;
    }
  }
  
  /**
   * Adicionar conteúdo à apostila
   * @param apostilaId ID da apostila
   * @param conteudo Conteúdo a ser adicionado
   * @returns Conteúdo adicionado
   */
  async adicionarConteudo(apostilaId: string, conteudo: Partial<ConteudoApostila>): Promise<ConteudoApostila> {
    try {
      this.logger.debug(`Adicionando conteúdo à apostila: ${apostilaId}`);
      
      // Validar ID da apostila
      this.validateId(apostilaId);
      
      // Verificar se apostila existe
      const apostilaExiste = await this.existePorId(apostilaId);
      
      if (!apostilaExiste) {
        throw new NotFoundError(`Apostila com ID ${apostilaId} não encontrada`);
      }
      
      // Validar conteúdo
      if (!conteudo.titulo) {
        throw new ValidationError('Título do conteúdo é obrigatório');
      }
      
      if (!conteudo.conteudo_json) {
        throw new ValidationError('Conteúdo JSON é obrigatório');
      }
      
      // Preparar dados
      const dadosConteudo = {
        apostila_id: apostilaId,
        titulo: conteudo.titulo,
        conteudo_json: conteudo.conteudo_json,
        numero_modulo: conteudo.numero_modulo || 1,
        concurso_id: conteudo.concurso_id,
        criado_em: new Date().toISOString(),
      };
      
      // Criar query
      const query = this.supabase
        .from('conteudo_apostilas')
        .insert(dadosConteudo)
        .select('*')
        .single();
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      if (!result.data) {
        throw new Error('Falha ao adicionar conteúdo à apostila');
      }
      
      this.logger.info(`Conteúdo adicionado à apostila ${apostilaId} com sucesso`);
      
      return result.data as ConteudoApostila;
    } catch (error) {
      this.handleError(`adicionarConteudo:${apostilaId}`, error);
      throw error;
    }
  }
  
  /**
   * Atualizar conteúdo da apostila
   * @param conteudoId ID do conteúdo
   * @param dados Dados para atualização
   * @returns Conteúdo atualizado
   */
  async atualizarConteudo(conteudoId: string, dados: Partial<ConteudoApostila>): Promise<ConteudoApostila> {
    try {
      this.logger.debug(`Atualizando conteúdo: ${conteudoId}`);
      
      // Validar ID
      this.validateId(conteudoId);
      
      // Criar query
      const query = this.supabase
        .from('conteudo_apostilas')
        .update({
          titulo: dados.titulo,
          conteudo_json: dados.conteudo_json,
          numero_modulo: dados.numero_modulo,
        })
        .eq('id', conteudoId)
        .select('*')
        .single();
      
      // Executar query com retry
      const result = await this.executeWithRetry(async () => {
        return await query;
      });
      
      if (!result.data) {
        throw new NotFoundError(`Conteúdo com ID ${conteudoId} não encontrado`);
      }
      
      this.logger.info(`Conteúdo ${conteudoId} atualizado com sucesso`);
      
      return result.data as ConteudoApostila;
    } catch (error) {
      this.handleError(`atualizarConteudo:${conteudoId}`, error);
      throw error;
    }
  }
  
  /**
   * Remover conteúdo da apostila
   * @param conteudoId ID do conteúdo
   * @returns True se removido com sucesso
   */
  async removerConteudo(conteudoId: string): Promise<boolean> {
    try {
      this.logger.debug(`Removendo conteúdo: ${conteudoId}`);
      
      // Validar ID
      this.validateId(conteudoId);
      
      // Criar query
      const query = this.supabase
        .from('conteudo_apostilas')
        .delete()
        .eq('id', conteudoId);
      
      // Executar query com retry
      await this.executeWithRetry(async () => {
        return await query;
      });
      
      this.logger.info(`Conteúdo ${conteudoId} removido com sucesso`);
      
      return true;
    } catch (error) {
      this.handleError(`removerConteudo:${conteudoId}`, error);
      throw error;
    }
  }
  
  /**
   * Aplicar filtros à query
   * @param query Query base
   * @param filtro Filtro a ser aplicado
   * @returns Query com filtros aplicados
   */
  protected applyFilters<TQuery extends object>(query: TQuery, filtro: FiltroApostila): TQuery {
    // Só aplica filtros se for um PostgrestFilterBuilder
    if (this.isPostgrestFilterBuilder(query)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = query as any;
      if (filtro.categoria_id) {
        q = q.eq('categoria_id', filtro.categoria_id);
      }
      if (filtro.concurso_id) {
        q = q.eq('concurso_id', filtro.concurso_id);
      }
      if (filtro.search) {
        q = q.or(`titulo.ilike.%${filtro.search}%,descricao.ilike.%${filtro.search}%`);
      }
      if (filtro.disciplina) {
        q = q.contains('disciplinas', [filtro.disciplina]);
      }
      if (filtro.ativo !== undefined) {
        q = q.eq('ativo', filtro.ativo);
      }
      return q as TQuery;
    }
    return query;
  }

  /**
   * Type guard para PostgrestFilterBuilder
   */
  private isPostgrestFilterBuilder(obj: unknown): boolean {
    return !!obj && typeof (obj as { eq?: unknown }).eq === 'function' && typeof (obj as { or?: unknown }).or === 'function' && typeof (obj as { contains?: unknown }).contains === 'function';
  }
  
  /**
   * Preparar dados para inserção
   * @param dados Dados a serem preparados
   * @returns Dados preparados
   */
  protected prepareDataForInsert(dados: Partial<Apostila>): Record<string, unknown> {
    const preparedData = { ...dados as Record<string, unknown> };
    // Gerar slug se não fornecido
    if (!('slug' in preparedData) && typeof preparedData.titulo === 'string') {
      preparedData.slug = this.gerarSlug(preparedData.titulo);
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
  protected prepareDataForUpdate(dados: Partial<Apostila>): Record<string, unknown> {
    const preparedData = { ...dados as Record<string, unknown> };
    // Gerar slug se título foi alterado e slug não foi fornecido
    if (!('slug' in preparedData) && typeof preparedData.titulo === 'string') {
      preparedData.slug = this.gerarSlug(preparedData.titulo);
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
  protected validateData(dados: Partial<Apostila>, isUpdate: boolean = false): void {
    super.validateData(dados, isUpdate);
    
    // Validações específicas para apostila
    if (!isUpdate && !dados.titulo) {
      throw new ValidationError('Título da apostila é obrigatório');
    }
    
    // Validar disciplinas
    if (dados.disciplinas && !Array.isArray(dados.disciplinas)) {
      throw new ValidationError('Disciplinas deve ser um array');
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