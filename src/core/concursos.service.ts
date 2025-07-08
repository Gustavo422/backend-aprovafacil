import { supabase } from '../config/supabase.js';

interface ListarParams {
  page?: number;
  limit?: number;
  categoria_id?: string;
  ano?: number;
  banca?: string;
  is_active?: boolean | string;
  search?: string;
}

interface ConcursoData {
  nome: string;
  descricao?: string;
  ano?: number;
  banca?: string;
  categoria_id?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export class ConcursosService {
  static async listar({ page = 1, limit = 10, categoria_id, ano, banca, is_active, search }: ListarParams) {
    let query = supabase
      .from('concursos')
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `);

    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }
    if (ano) {
      query = query.eq('ano', ano);
    }
    if (banca) {
      query = query.ilike('banca', `%${banca}%`);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === true || is_active === 'true');
    }
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    const { data: concursos, error: concursosError, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (concursosError) {
      throw concursosError;
    }

    let totalCount = 0;
    if (count === null) {
      const { count: total } = await supabase
        .from('concursos')
        .select('*', { count: 'exact', head: true });
      totalCount = total || 0;
    } else {
      totalCount = count;
    }

    const totalPages = Math.ceil(totalCount / limit);

    return {
      concursos: concursos || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages
      }
    };
  }

  static async buscarPorId(id: string) {
    const { data: concurso, error } = await supabase
      .from('concursos')
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }
    return concurso;
  }

  static async criar(concursoData: ConcursoData) {
    const { data: concurso, error } = await supabase
      .from('concursos')
      .insert(concursoData)
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .single();

    if (error) {
      throw error;
    }
    return concurso;
  }
} 