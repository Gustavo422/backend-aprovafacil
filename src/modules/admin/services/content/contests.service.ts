import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';
import { gerarSlug } from '../../utils/slug.js';

export class ContestsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarConcurso(dados: {
    nome: string;
    descricao?: string;
    categoria_id: string;
    ano?: number;
    banca?: string;
    nivel_dificuldade: 'facil' | 'medio' | 'dificil';
    multiplicador_questoes: number;
  }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarConcurso', { nome: dados.nome });

      const slug = gerarSlug(dados.nome);

      const { data, error } = await this.ctx.supabase
        .from('concursos')
        .insert({
          ...dados,
          slug,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Falha ao criar concurso: dados não retornados');

      await this.ctx.logService.logarCriacaoConteudo('concurso', String(data.id));
      await this.ctx.logService.logarFimOperacao('criarConcurso', true);

      return { success: true, data, message: 'Concurso criado com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar concurso', error as Error, { dados });
      throw error;
    }
  }

  async listarConcursos(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase
        .from('concursos')
        .select('*');

      if (filtro?.categoria_id) query = query.eq('categoria_id', filtro.categoria_id);
      if (filtro?.ativo !== undefined) query = query.eq('ativo', filtro.ativo);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Concursos listados' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar concursos', error as Error);
      throw error;
    }
  }

  async atualizarConcurso(id: string, dados: { nome?: string; descricao?: string; categoria_id?: string; ano?: number; banca?: string; nivel_dificuldade?: 'facil' | 'medio' | 'dificil'; multiplicador_questoes?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('concursos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Concurso atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar concurso', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConcurso(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('concursos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, data: true, message: 'Concurso excluído' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir concurso', error as Error, { id });
      throw error;
    }
  }

  // Categorias de concurso
  async criarCategoriasConcursos(dados: { nome: string; descricao?: string; icone?: string; cor?: string; ordem?: number }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarCategoriasConcursos', { nome: dados.nome });
      const slug = gerarSlug(dados.nome);
      const { data, error } = await this.ctx.supabase
        .from('categorias_concursos')
        .insert({ ...dados, slug, ativo: true, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      await this.ctx.logService.logarCriacaoConteudo('categoria_concurso', String(data.id));
      return { success: true, data, message: 'Categoria de concurso criada com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar categoria de concurso', error as Error, { dados });
      throw error;
    }
  }

  async listarCategoriasConcursos(filtro?: { ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase.from('categorias_concursos').select('*');
      if (filtro?.ativo !== undefined) query = query.eq('ativo', filtro.ativo);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Categorias listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar categorias', error as Error);
      throw error;
    }
  }

  async atualizarCategoriasConcursos(id: string, dados: { nome?: string; descricao?: string; icone?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('categorias_concursos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Categoria atualizada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar categoria', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirCategoriasConcursos(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('categorias_concursos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Categoria excluída' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir categoria', error as Error, { id });
      throw error;
    }
  }

  // Disciplinas por categoria
  async criarDisciplinasCategoria(dados: { categoria_id: string; nome: string; descricao?: string; cor?: string; ordem?: number }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('disciplinas_categoria')
        .insert({ ...dados, ativo: true, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      await this.ctx.logService.logarCriacaoConteudo('disciplina', String(data.id));
      return { success: true, data, message: 'Disciplina criada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar disciplina', error as Error, { dados });
      throw error;
    }
  }

  async listarDisciplinasCategoria(filtro?: { categoria_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase.from('disciplinas_categoria').select('*');
      if (filtro?.categoria_id) query = query.eq('categoria_id', filtro.categoria_id);
      if (filtro?.ativo !== undefined) query = query.eq('ativo', filtro.ativo);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Disciplinas listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar disciplinas', error as Error);
      throw error;
    }
  }

  async atualizarDisciplinasCategoria(id: string, dados: { categoria_id?: string; nome?: string; descricao?: string; cor?: string; ordem?: number; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('disciplinas_categoria')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Disciplina atualizada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar disciplina', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirDisciplinasCategoria(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('disciplinas_categoria')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Disciplina excluída' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir disciplina', error as Error, { id });
      throw error;
    }
  }
}

export default ContestsAdminService;