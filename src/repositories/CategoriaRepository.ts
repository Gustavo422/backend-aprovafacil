/**
 * Repositório de Categorias
 * 
 * Este repositório é responsável por gerenciar as operações relacionadas às categorias.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ValidationError } from '../core/errors/index.js';
import { createDebugger } from '../utils/debugger.js';

/**
 * Interface para categoria
 */
export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface para categoria com filhos
 */
export interface CategoriaComFilhos extends Categoria {
  filhos: Categoria[];
}

/**
 * Opções para o repositório de categorias
 */
export interface CategoriaRepositoryOptions {
  supabaseClient: SupabaseClient;
}

/**
 * Repositório de categorias
 */
export class CategoriaRepository {
  /**
   * Cliente Supabase
   */
  protected supabaseClient: SupabaseClient;
  
  /**
   * Nome da tabela
   */
  protected tableName: string = 'categorias';
  
  /**
   * Debug logger
   */
  private debug = createDebugger('repository:categoria');
  
  /**
   * Construtor
   * @param options Opções do repositório
   */
  constructor(options: CategoriaRepositoryOptions) {
    this.supabaseClient = options.supabaseClient;
    this.debug('Repositório de categorias inicializado');
  }
  
  /**
   * Buscar todas as categorias
   * @returns Lista de categorias
   */
  async buscarTodas(): Promise<Categoria[]> {
    this.debug('Buscando todas as categorias');
    try {
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .order('nome');
      
      if (error) {
        this.debug('Erro ao buscar categorias: %s', error.message);
        console.error(`Erro ao buscar categorias: ${error.message}`);
        return [];
      }
      
      this.debug('Categorias encontradas: %d', data?.length || 0);
      return data || [];
    } catch (error) {
      this.debug('Exceção ao buscar categorias: %o', error);
      console.error(`Erro ao buscar categorias: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Buscar categorias com filhos
   * @returns Lista de categorias com filhos
   */
  async buscarComFilhos(): Promise<CategoriaComFilhos[]> {
    try {
      // Buscar todas as categorias
      const { data: categorias, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .order('nome');
      
      if (error) {
        console.error(`Erro ao buscar categorias com filhos: ${error.message}`);
        return [];
      }
      
      if (!categorias || categorias.length === 0) {
        return [];
      }
      
      // Mapear categorias pai
      const categoriasMap = new Map<string, CategoriaComFilhos>();
      const categoriasRaiz: CategoriaComFilhos[] = [];
      
      // Inicializar todas as categorias com array de filhos vazio
      categorias.forEach(categoria => {
        const categoriaComFilhos: CategoriaComFilhos = {
          ...categoria,
          filhos: []
        };
        
        categoriasMap.set(categoria.id, categoriaComFilhos);
        
        // Se não tem pai, é uma categoria raiz
        if (!categoria.parent_id) {
          categoriasRaiz.push(categoriaComFilhos);
        }
      });
      
      // Adicionar filhos às categorias pai
      categorias.forEach(categoria => {
        if (categoria.parent_id) {
          const categoriaPai = categoriasMap.get(categoria.parent_id);
          if (categoriaPai) {
            categoriaPai.filhos.push({
              ...categoria,
              filhos: categoriasMap.get(categoria.id)?.filhos || []
            });
          }
        }
      });
      
      return categoriasRaiz;
    } catch (error) {
      console.error(`Erro ao buscar categorias com filhos: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Buscar categoria por ID
   * @param id ID da categoria
   * @returns Categoria encontrada ou null
   */
  async buscarPorId(id: string): Promise<Categoria | null> {
    this.debug('Buscando categoria por ID: %s', id);
    try {
      if (!this.validarUUID(id)) {
        this.debug('ID inválido fornecido: %s', id);
        throw new ValidationError(`ID inválido: ${id}`);
      }
      
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        this.debug('Erro ao buscar categoria por ID %s: %s', id, error.message);
        console.error(`Erro ao buscar categoria por ID: ${error.message}`);
        return null;
      }
      
      this.debug('Categoria %s encontrada: %o', id, data ? true : false);
      return data || null;
    } catch (error) {
      this.debug('Exceção ao buscar categoria por ID %s: %o', id, error);
      console.error(`Erro ao buscar categoria por ID: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Buscar categorias por nome
   * @param nome Nome ou parte do nome da categoria
   * @returns Lista de categorias
   */
  async buscarPorNome(nome: string): Promise<Categoria[]> {
    try {
      if (!nome) {
        throw new ValidationError('Nome não pode ser vazio');
      }
      
      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .ilike('nome', `%${nome}%`)
        .order('nome');
      
      if (error) {
        console.error(`Erro ao buscar categorias por nome: ${error.message}`);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar categorias por nome: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Validar UUID
   * @param uuid UUID a ser validado
   * @returns True se for válido
   */
  private validarUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}